import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { DriverLoginDto } from './dto/driver-login.dto';

@Injectable()
export class DriverAuthService {
  private readonly logger = new Logger(DriverAuthService.name);

  constructor(
    private prisma: PrismaService,
    private supabase: SupabaseService,
  ) {}

  async login(dto: DriverLoginDto) {
    const driver = await this.prisma.driver.findFirst({
      where: { phone: dto.phone },
      include: {
        branch: { select: { id: true, name: true } },
        driverSettings: true,
      },
    });

    if (!driver) throw new UnauthorizedException('Invalid credentials');

    if (driver.status === 'suspended') {
      throw new ForbiddenException('Driver account is suspended');
    }
    if (driver.status === 'inactive') {
      throw new ForbiddenException('Driver account is inactive');
    }
    if (!driver.email) {
      throw new UnauthorizedException(
        'No login credentials set up. Contact your administrator.',
      );
    }

    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email: driver.email,
      password: dto.password,
    });

    if (error) throw new UnauthorizedException('Invalid credentials');

    return {
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      expiresIn: 3600,
      requiresTwoFactor: false,
      driver: {
        id: driver.id,
        fullName: driver.fullName,
        phone: driver.phone,
        branchId: driver.branchId,
        branchName: driver.branch.name,
        status: driver.status,
        isOnline: driver.isAvailable,
        avatarUrl: driver.avatarUrl,
      },
    };
  }

  async verify2fa(code: string, driverId: string) {
    if (!code || code.length !== 6) {
      throw new BadRequestException('Invalid 2FA code');
    }
    const driver = await this.prisma.driver.findFirst({
      where: { id: driverId },
      include: { branch: { select: { id: true, name: true } } },
    });
    if (!driver) throw new UnauthorizedException('Driver not found');
    return { verified: true };
  }

  async changePassword(
    driverId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    const driver = await this.prisma.driver.findFirst({ where: { id: driverId } });
    if (!driver || !driver.email) throw new UnauthorizedException('Driver not found');

    const { error: signInError } = await this.supabase.client.auth.signInWithPassword({
      email: driver.email,
      password: currentPassword,
    });
    if (signInError) throw new BadRequestException('Current password is incorrect');

    const { data: authUsers } = await this.supabase.adminClient.auth.admin.listUsers();
    const authUser = authUsers.users.find((u: any) => u.email === driver.email);
    if (!authUser) throw new UnauthorizedException('Auth user not found');

    const { error } = await this.supabase.adminClient.auth.admin.updateUserById(
      authUser.id,
      { password: newPassword },
    );
    if (error) throw new BadRequestException(error.message);
    return { changed: true, message: 'Password updated successfully' };
  }

  async getDriverSession(token: string) {
    const { data: { user }, error } = await this.supabase.client.auth.getUser(token);
    if (error || !user) throw new UnauthorizedException('Invalid session');

    const driver = await this.prisma.driver.findFirst({
      where: { email: user.email },
      include: { branch: { select: { id: true, name: true } } },
    });
    if (!driver) throw new UnauthorizedException('Driver not found');

    return {
      id: driver.id,
      fullName: driver.fullName,
      phone: driver.phone,
      branchId: driver.branchId,
      branchName: driver.branch.name,
      isOnline: driver.isAvailable,
      status: driver.status,
    };
  }
}