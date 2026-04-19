import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { EmailService } from '../../core/email/email.service';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private supabase: SupabaseService,
    private email: EmailService,
  ) {}

  async adminLogin(dto: LoginDto, ipAddress: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
      include: { branch: { select: { id: true, name: true, type: true } } },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Check lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Account locked. Try again in ${minutesLeft} minutes.`,
      );
    }

    if (user.status === 'inactive') {
      throw new ForbiddenException('Account is inactive');
    }
    if (user.status === 'suspended') {
      throw new ForbiddenException('Account is suspended');
    }

    // Authenticate against Supabase Auth
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      const failed = user.failedLoginCount + 1;
      const lockUntil =
        failed >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: failed, lockedUntil: lockUntil },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const sessionId = data.session?.access_token.slice(-16) ?? '';

    // Check if 2FA required
    if (user.twoFactorEnabled) {
      return {
        requiresTwoFactor: true,
        sessionId,
        userId: user.id,
      };
    }

    return {
      requiresTwoFactor: false,
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      sessionId,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        branchId: user.branchId,
        branchName: user.branch.name,
        branchType: user.branch.type,
        avatarUrl: user.avatarUrl,
        twoFactorEnabled: user.twoFactorEnabled,
        status: user.status,
      },
    };
  }

  async adminLogout() {
    await this.supabase.client.auth.signOut();
    return { message: 'Logged out successfully' };
  }

  async refreshToken(dto: { refreshToken: string }) {
    const { data, error } = await this.supabase.client.auth.refreshSession({
      refresh_token: dto.refreshToken,
    });
    if (error || !data.session) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  async forgotPassword(email: string) {
    const { error } = await this.supabase.client.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${process.env.FRONTEND_URL}/reset-password` },
    );
    if (error) {
      this.logger.warn(`Password reset error for ${email}: ${error.message}`);
    }
    // Always return success — prevent email enumeration
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const { error } = await this.supabase.client.auth.updateUser({
      password: dto.newPassword,
    });

    if (error) throw new BadRequestException(error.message);
    return { message: 'Password reset successfully' };
  }

  async getSession(token: string) {
    const { data: { user }, error } =
      await this.supabase.client.auth.getUser(token);
    if (error || !user) throw new UnauthorizedException('Invalid session');

    const appUser = await this.prisma.user.findFirst({
      where: { email: user.email },
      include: { branch: { select: { id: true, name: true, type: true } } },
    });

    if (!appUser) throw new UnauthorizedException('User not found');

    return {
      id: appUser.id,
      email: appUser.email,
      fullName: appUser.fullName,
      role: appUser.role,
      branchId: appUser.branchId,
      branchName: appUser.branch.name,
      branchType: appUser.branch.type,
      avatarUrl: appUser.avatarUrl,
      status: appUser.status,
    };
  }
}