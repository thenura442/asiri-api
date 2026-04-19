import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { CustomerRegisterDto } from './dto/customer-register.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';

// In-memory OTP store (use Redis in production)
const otpStore = new Map<string, { code: string; expiresAt: Date }>();

@Injectable()
export class CustomerAuthService {
  private readonly logger = new Logger(CustomerAuthService.name);

  constructor(
    private prisma: PrismaService,
    private supabase: SupabaseService,
  ) {}

  async register(dto: CustomerRegisterDto) {
    if (!dto.acceptedTerms) {
      throw new BadRequestException('You must accept the terms and conditions');
    }

    // Duplicate NIC check
    const existingNic = await this.prisma.patient.findFirst({
      where: { nic: dto.nic },
    });
    if (existingNic) {
      throw new ConflictException('A patient with this NIC already exists');
    }

    // Duplicate phone check
    const existingPhone = await this.prisma.patient.findFirst({
      where: { phone: dto.phone },
    });
    if (existingPhone) {
      throw new ConflictException(
        'A patient with this phone number already exists',
      );
    }

    // Create Supabase Auth user
    // Use phone-derived email as Supabase identifier
    const supabaseEmail = `${dto.phone.replace('+', '')}@customer.asiri.lk`;

    const { data: authData, error: authError } =
      await this.supabase.adminClient.auth.admin.createUser({
        email: supabaseEmail,
        password: dto.password,
        email_confirm: true,
        phone: dto.phone,
      });

    if (authError) {
      if (authError.message.includes('already registered')) {
        throw new ConflictException('Phone number already registered');
      }
      throw new BadRequestException(authError.message);
    }

    // Set flagNewUntil to 2 weeks from now
    const flagNewUntil = new Date();
    flagNewUntil.setDate(flagNewUntil.getDate() + 14);

    // Create patient record
    const patient = await this.prisma.patient.create({
      data: {
        authUserId: authData.user.id,
        fullName: `${dto.firstName} ${dto.lastName}`,
        nic: dto.nic,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        phone: dto.phone,
        email: dto.email,
        bloodGroup: dto.bloodGroup,
        address: dto.address,
        emergencyName: dto.emergencyContactName,
        emergencyPhone: dto.emergencyContactPhone,
        flag: 'new',
        flagNewUntil,
      },
    });

    // Generate and store OTP for phone verification
    const otp = this.generateOtp();
    otpStore.set(dto.phone, {
      code: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min expiry
    });

    this.logger.log(`OTP for ${dto.phone}: ${otp}`); // In production — send via SMS

    // Sign in to get tokens
    const { data: signInData } =
      await this.supabase.client.auth.signInWithPassword({
        email: supabaseEmail,
        password: dto.password,
      });

    return {
      accessToken: signInData.session?.access_token,
      refreshToken: signInData.session?.refresh_token,
      requiresOtpVerification: true,
      user: {
        id: patient.id,
        fullName: patient.fullName,
        phone: patient.phone,
        email: patient.email,
        avatarUrl: null,
        flag: patient.flag,
      },
    };
  }

  async login(dto: CustomerLoginDto) {
    // Find patient by phone
    const patient = await this.prisma.patient.findFirst({
      where: { phone: dto.phone },
    });
    if (!patient) throw new UnauthorizedException('Invalid credentials');

    if (patient.flag === 'blacklisted') {
      throw new ForbiddenException('Account has been suspended');
    }

    const supabaseEmail = `${dto.phone.replace('+', '')}@customer.asiri.lk`;

    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email: supabaseEmail,
      password: dto.password,
    });

    if (error) throw new UnauthorizedException('Invalid credentials');

    return {
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      requiresTwoFactor: false,
      user: {
        id: patient.id,
        fullName: patient.fullName,
        phone: patient.phone,
        email: patient.email,
        avatarUrl: null,
        flag: patient.flag,
      },
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const stored = otpStore.get(dto.phone);

    if (!stored) {
      throw new BadRequestException('No OTP found for this phone number');
    }
    if (stored.expiresAt < new Date()) {
      otpStore.delete(dto.phone);
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }
    if (stored.code !== dto.code) {
      throw new BadRequestException('Invalid OTP code');
    }

    otpStore.delete(dto.phone);

    // Find patient
    const patient = await this.prisma.patient.findFirst({
      where: { phone: dto.phone },
    });

    return {
      verified: true,
      patientId: patient?.id,
    };
  }

  async resendOtp(dto: ResendOtpDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { phone: dto.phone },
    });
    if (!patient) throw new BadRequestException('Phone number not registered');

    const otp = this.generateOtp();
    otpStore.set(dto.phone, {
      code: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    this.logger.log(`Resend OTP for ${dto.phone}: ${otp}`);
    // In production — send via SmsService

    return { message: 'OTP sent successfully' };
  }

  async googleAuth(dto: GoogleAuthDto) {
    // Verify Google ID token via Supabase
    const { data, error } = await this.supabase.client.auth.signInWithIdToken({
      provider: 'google',
      token: dto.idToken,
    });

    if (error) throw new UnauthorizedException('Invalid Google token');

    const googleUser = data.user;
    const email = googleUser?.email;
    const fullName = googleUser?.user_metadata?.full_name ?? '';

    // Check if patient already exists
    let patient = await this.prisma.patient.findFirst({
      where: { authUserId: googleUser?.id },
    });

    if (!patient && email) {
      patient = await this.prisma.patient.findFirst({ where: { email } });
    }

    if (!patient) {
      // Create new patient from Google profile
      const flagNewUntil = new Date();
      flagNewUntil.setDate(flagNewUntil.getDate() + 14);

      patient = await this.prisma.patient.create({
        data: {
          authUserId: googleUser?.id,
          fullName: fullName || 'Google User',
          nic: `GOOGLE-${googleUser?.id?.slice(0, 8)}`, // Placeholder
          dateOfBirth: new Date('2000-01-01'), // Placeholder — user must update
          gender: 'other',
          phone: googleUser?.phone ?? '',
          email,
          address: '',
          flag: 'new',
          flagNewUntil,
        },
      });
    }

    return {
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      isNewUser: !patient,
      user: {
        id: patient.id,
        fullName: patient.fullName,
        phone: patient.phone,
        email: patient.email,
        avatarUrl: googleUser?.user_metadata?.avatar_url ?? null,
        flag: patient.flag,
      },
    };
  }

  async getCustomerSession(token: string) {
    const { data: { user }, error } =
      await this.supabase.client.auth.getUser(token);
    if (error || !user) throw new UnauthorizedException('Invalid session');

    const patient = await this.prisma.patient.findFirst({
      where: { authUserId: user.id },
    });

    if (!patient) throw new UnauthorizedException('Patient not found');

    return {
      id: patient.id,
      fullName: patient.fullName,
      phone: patient.phone,
      email: patient.email,
      flag: patient.flag,
    };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}