import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { EmailService } from '../../core/email/email.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FilterUsersDto } from './dto/filter-users.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { UserRole } from '../../common/enums/role.enum';

// Helper to strip passwordHash from any user object
function stripPassword<T extends { passwordHash?: any }>(user: T): Omit<T, 'passwordHash'> {
  const { passwordHash, ...rest } = user;
  return rest;
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private supabase: SupabaseService,
    private email: EmailService,
  ) {}

  async create(dto: CreateUserDto) {
    // Validate branch exists
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId },
    });
    if (!branch) throw new BadRequestException('Branch not found');

    // Validate role vs branch type
    if (
      [UserRole.LAB_MANAGER, UserRole.LAB_TECHNICIAN].includes(dto.role) &&
      branch.type !== 'lab'
    ) {
      throw new BadRequestException(
        'Lab Manager and Lab Technician can only be assigned to lab-type branches',
      );
    }

    // Check one Lab Manager per lab branch
    if (dto.role === UserRole.LAB_MANAGER) {
      const existingLM = await this.prisma.user.findFirst({
        where: { branchId: dto.branchId, role: 'lab_manager' },
      });
      if (existingLM) {
        throw new ConflictException('This branch already has a Lab Manager');
      }
    }

    // Create user in Supabase Auth first
    const { data: authData, error: authError } =
      await this.supabase.adminClient.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
      });

    if (authError) {
      if (authError.message.includes('already registered')) {
        throw new ConflictException('Email already in use');
      }
      throw new BadRequestException(authError.message);
    }

    // Create user in our database
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: 'managed-by-supabase-auth',
        fullName: dto.fullName,
        role: dto.role,
        branchId: dto.branchId,
        staffId: dto.staffId,
        nic: dto.nic,
        phone: dto.phone,
        roleTitle: dto.roleTitle,
        department: dto.department,
        qualification: dto.qualification,
        notes: dto.notes,
        twoFactorEnabled: dto.twoFactorEnabled ?? false,
        status: 'active',
      },
      include: { branch: { select: { id: true, name: true } } },
    });

    // Send welcome email
    await this.email.sendWelcome(dto.email, dto.fullName);

    return stripPassword(user);
  }

  async findAll(dto: FilterUsersDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (dto.role) where.role = dto.role;
    if (dto.status) where.status = dto.status;
    if (dto.branchId) where.branchId = dto.branchId;
    if (dto.search) {
      where.OR = [
        { fullName: { contains: dto.search, mode: 'insensitive' } },
        { email: { contains: dto.search, mode: 'insensitive' } },
        { staffId: { contains: dto.search, mode: 'insensitive' } },
        { nic: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          branch: { select: { id: true, name: true, type: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data.map(stripPassword),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id },
      include: {
        branch: { select: { id: true, name: true, type: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return stripPassword(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId },
      });
      if (!branch) throw new BadRequestException('Branch not found');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
      include: {
        branch: { select: { id: true, name: true } },
      },
    });

    return stripPassword(user);
  }

  async remove(id: string) {
    const user = await this.findOne(id);

    // Delete from Supabase Auth
    const { data: authUsers } =
      await this.supabase.adminClient.auth.admin.listUsers();
    const authUser = authUsers.users.find((u: any) => u.email === user.email);

    if (authUser) {
      await this.supabase.adminClient.auth.admin.deleteUser(authUser.id);
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }

  async unlock(id: string) {
    await this.findOne(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
    return { ...stripPassword(user), isLocked: false };
  }

  async resetPassword(id: string, newPassword: string) {
    const user = await this.findOne(id);

    const { data: authUsers } =
      await this.supabase.adminClient.auth.admin.listUsers();
    const authUser = authUsers.users.find((u: any) => u.email === user.email);

    if (!authUser) throw new NotFoundException('Auth user not found');

    // Trigger Supabase password reset email
    const { error } =
      await this.supabase.client.auth.resetPasswordForEmail(user.email);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Password reset email sent successfully' };
  }
}