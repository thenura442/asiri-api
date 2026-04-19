import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

function stripPassword<T extends { passwordHash?: any }>(user: T): Omit<T, 'passwordHash'> {
  const { passwordHash, ...rest } = user;
  return rest;
}

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    private supabase: SupabaseService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      include: {
        branch: { select: { id: true, name: true, type: true, isOnline: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return stripPassword(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    return stripPassword(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const { error: signInError } =
      await this.supabase.client.auth.signInWithPassword({
        email: user.email,
        password: dto.currentPassword,
      });
    if (signInError) throw new BadRequestException('Current password is incorrect');

    const { data: authUsers } =
      await this.supabase.adminClient.auth.admin.listUsers();
    const authUser = authUsers.users.find((u: any) => u.email === user.email);
    if (!authUser) throw new NotFoundException('Auth user not found');

    const { error } =
      await this.supabase.adminClient.auth.admin.updateUserById(authUser.id, {
        password: dto.newPassword,
      });
    if (error) throw new BadRequestException(error.message);
    return { message: 'Password changed successfully' };
  }

  async getBranchStatus(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            isOnline: true,
            operatingStart: true,
            operatingEnd: true,
          },
        },
      },
    });
    return user?.branch ?? null;
  }

  async logoutAll(userId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const { data: authUsers } =
      await this.supabase.adminClient.auth.admin.listUsers();
    const authUser = authUsers.users.find((u: any) => u.email === user.email);

    if (authUser) {
      await this.supabase.adminClient.auth.admin.signOut(authUser.id, 'others');
    }

    return { terminatedCount: 1, message: 'All other sessions terminated' };
  }
}