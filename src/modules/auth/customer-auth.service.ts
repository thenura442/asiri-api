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
import { GoogleAuthDto } from './dto/google-auth.dto';

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
      throw new ConflictException('A patient with this phone number already exists');
    }

    // Use phone-derived email as Supabase identifier
    const supabaseEmail = `${dto.phone.replace('+', '')}@customer.asiri.lk`;

    const { data: authData, error: authError } =
      await this.supabase.adminClient.auth.admin.createUser({
        email:         supabaseEmail,
        password:      dto.password,
        email_confirm: true,
        phone:         dto.phone,
      });

    if (authError) {
      if (
        authError.message.includes('already registered') ||
        authError.message.includes('already been registered') ||
        authError.message.includes('email address has already')
      ) {
        throw new ConflictException('Phone number already registered');
      }
      throw new BadRequestException(authError.message);
    }

    const flagNewUntil = new Date();
    flagNewUntil.setDate(flagNewUntil.getDate() + 14);

    const patient = await this.prisma.patient.create({
      data: {
        authUserId:          authData.user.id,
        fullName:            dto.fullName,
        nic:                 dto.nic,
        dateOfBirth:         new Date(dto.dateOfBirth),
        gender:              dto.gender,
        phone:               dto.phone,
        email:               dto.email               ?? null,
        bloodGroup:          dto.bloodGroup           ?? null,
        address:             dto.address,
        city:                dto.city                ?? null,
        district:            dto.district             ?? null,
        emergencyName:       dto.emergencyContactName  ?? null,
        emergencyPhone:      dto.emergencyContactPhone ?? null,
        flag:                'new',
        flagNewUntil,
      },
    });

    this.logger.log(`Patient registered: ${patient.phone}`);

    // Return minimal response — frontend navigates to login
    return {
      message: 'Registration successful. Please sign in.',
      user: {
        id:       patient.id,
        fullName: patient.fullName,
        phone:    patient.phone,
      },
    };
  }

  async login(dto: CustomerLoginDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { phone: dto.phone },
    });
    if (!patient) throw new UnauthorizedException('Invalid credentials');

    if (patient.flag === 'blacklisted') {
      throw new ForbiddenException('Account has been suspended');
    }

    const supabaseEmail = `${dto.phone.replace('+', '')}@customer.asiri.lk`;

    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email:    supabaseEmail,
      password: dto.password,
    });

    if (error) throw new UnauthorizedException('Invalid credentials');

    return {
      accessToken:  data.session?.access_token  ?? null,
      refreshToken: data.session?.refresh_token ?? null,
      expiresIn:    data.session?.expires_in    ?? 3600,
      requires2fa:  false,
      user: {
        id:        patient.id,
        fullName:  patient.fullName,
        phone:     patient.phone,
        email:     patient.email  ?? null,
        avatarUrl: null,
        flag:      patient.flag,
        role:      'customer' as const,
      },
    };
  }

  async googleAuth(dto: GoogleAuthDto) {
    const { data, error } = await this.supabase.client.auth.signInWithIdToken({
      provider: 'google',
      token:    dto.idToken,
    });

    if (error) throw new UnauthorizedException('Invalid Google token');

    const googleUser = data.user;
    const email      = googleUser?.email;
    const fullName   = googleUser?.user_metadata?.full_name ?? '';

    let patient = await this.prisma.patient.findFirst({
      where: { authUserId: googleUser?.id },
    });

    if (!patient && email) {
      patient = await this.prisma.patient.findFirst({ where: { email } });
    }

    if (!patient) {
      const flagNewUntil = new Date();
      flagNewUntil.setDate(flagNewUntil.getDate() + 14);

      patient = await this.prisma.patient.create({
        data: {
          authUserId:  googleUser?.id ?? '',
          fullName:    fullName || 'Google User',
          nic:         `GOOGLE-${googleUser?.id?.slice(0, 8)}`,
          dateOfBirth: new Date('2000-01-01'),
          gender:      'other',
          phone:       googleUser?.phone ?? '',
          email:       email             ?? null,
          address:     '',
          flag:        'new',
          flagNewUntil,
        },
      });
    }

    return {
      accessToken:  data.session?.access_token  ?? null,
      refreshToken: data.session?.refresh_token ?? null,
      expiresIn:    data.session?.expires_in    ?? 3600,
      requires2fa:  false,
      isNewUser:    !patient,
      user: {
        id:        patient.id,
        fullName:  patient.fullName,
        phone:     patient.phone,
        email:     patient.email  ?? null,
        avatarUrl: googleUser?.user_metadata?.avatar_url ?? null,
        flag:      patient.flag,
        role:      'customer' as const,
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
      id:        patient.id,
      fullName:  patient.fullName,
      phone:     patient.phone,
      email:     patient.email ?? null,
      flag:      patient.flag,
      role:      'customer' as const,
    };
  }
}