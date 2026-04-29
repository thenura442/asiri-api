import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { FilterDriversDto } from './dto/filter-drivers.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { SupabaseService } from '@core/supabase/supabase.service';

@Injectable()
export class DriversService {
  constructor(
      private prisma: PrismaService,
      private supabase: SupabaseService,   // ← add
    ) {}

    async create(dto: CreateDriverDto) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId },
      });
      if (!branch) throw new BadRequestException('Branch not found');
      if (branch.type !== 'lab') {
        throw new BadRequestException('Drivers can only be assigned to lab-type branches');
      }

      // Same email-from-phone trick as customer auth
      const supabaseEmail = `${dto.phone.replace('+', '')}@driver.asiri.lk`;

      const { data: authData, error: authError } =
        await this.supabase.adminClient.auth.admin.createUser({
          email:         supabaseEmail,
          password:      dto.phone,    // initial password = phone number
          email_confirm: true,
          phone:         dto.phone,
        });

      if (authError) {
        if (
          authError.message.includes('already registered') ||
          authError.message.includes('already been registered') ||
          authError.message.includes('email address has already')
        ) {
          throw new BadRequestException('A driver with this phone number already has an auth account');
        }
        throw new BadRequestException(`Failed to create auth account: ${authError.message}`);
      }

      return this.prisma.driver.create({
        data: {
          authUserId:      authData.user.id,
          fullName:        dto.fullName,
          nic:             dto.nic,
          phone:           dto.phone,
          branchId:        dto.branchId,
          licenseNumber:   dto.licenseNumber,
          licenseExpiry:   new Date(dto.licenseExpiry),
          dateOfBirth:     dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          staffId:         dto.staffId         ?? null,
          email:           dto.email           ?? null,
          address:         dto.address         ?? null,
          licensePhotoUrl: dto.licensePhotoUrl ?? null,
          idFrontUrl:      dto.idFrontUrl      ?? null,
          idBackUrl:       dto.idBackUrl       ?? null,
          notes:           dto.notes           ?? null,
          status:          'active',
        },
        include: {
          branch: { select: { id: true, name: true } },
        },
      });
    }

  async findAll(
    dto: FilterDriversDto,
    userBranchId?: string,
    isSuperAdmin?: boolean,
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = dto;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (dto.status)   where.status   = dto.status;
    if (dto.branchId) where.branchId = dto.branchId;
    if (!isSuperAdmin && userBranchId) where.branchId = userBranchId;
    if (dto.search) {
      where.OR = [
        { fullName:      { contains: dto.search, mode: 'insensitive' } },
        { nic:           { contains: dto.search, mode: 'insensitive' } },
        { licenseNumber: { contains: dto.search, mode: 'insensitive' } },
        { phone:         { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [data, total] = await Promise.all([
      this.prisma.driver.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          branch: { select: { id: true, name: true } },
        },
      }),
      this.prisma.driver.count({ where }),
    ]);

    const enriched = data.map((driver) => {
      const expiry = new Date(driver.licenseExpiry);
      const now    = new Date();
      let licenseExpiryWarning: 'none' | 'expiring_soon' | 'expired' = 'none';
      if (expiry < now)                   licenseExpiryWarning = 'expired';
      else if (expiry <= thirtyDaysFromNow) licenseExpiryWarning = 'expiring_soon';

      return { ...driver, licenseExpiryWarning };
    });

    return {
      data: enriched,
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
    const driver = await this.prisma.driver.findFirst({
      where: { id, deletedAt: null },
      include: {
        branch:         { select: { id: true, name: true } },
        driverSettings: true,
      },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiry = new Date(driver.licenseExpiry);
    const now    = new Date();
    let licenseExpiryWarning: 'none' | 'expiring_soon' | 'expired' = 'none';
    if (expiry < now)                   licenseExpiryWarning = 'expired';
    else if (expiry <= thirtyDaysFromNow) licenseExpiryWarning = 'expiring_soon';

    return { ...driver, licenseExpiryWarning };
  }

  async update(id: string, dto: UpdateDriverDto) {
    await this.findOne(id);

    const data: any = {};
    if (dto.fullName      !== undefined) data.fullName      = dto.fullName;
    if (dto.nic           !== undefined) data.nic           = dto.nic;
    if (dto.phone         !== undefined) data.phone         = dto.phone;
    if (dto.email         !== undefined) data.email         = dto.email;
    if (dto.address       !== undefined) data.address       = dto.address;
    if (dto.branchId      !== undefined) data.branchId      = dto.branchId;
    if (dto.staffId       !== undefined) data.staffId       = dto.staffId;
    if (dto.licenseNumber !== undefined) data.licenseNumber = dto.licenseNumber;
    if (dto.status        !== undefined) data.status        = dto.status;
    if (dto.licenseExpiry !== undefined) data.licenseExpiry = new Date(dto.licenseExpiry);
    if (dto.dateOfBirth   !== undefined) data.dateOfBirth   = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;

    return this.prisma.driver.update({
      where: { id },
      data,
      include: {
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const activeJobs = await this.prisma.jobRequest.count({
      where: {
        driverId: id,
        status: { notIn: ['completed', 'cancelled', 'rejected', 'failed'] },
      },
    });

    if (activeJobs > 0) {
      throw new BadRequestException(
        `Cannot delete driver with ${activeJobs} active job(s)`,
      );
    }

    await this.prisma.vehicle.updateMany({
      where: { currentDriverId: id },
      data:  { currentDriverId: null },
    });

    // Soft delete
    await this.prisma.driver.update({
      where: { id },
      data:  { deletedAt: new Date() },
    });

    return { message: 'Driver deleted successfully' };
  }

  async updateDocuments(
    id: string,
    docs: {
      licensePhotoUrl?: string;
      idFrontUrl?:      string;
      idBackUrl?:       string;
      avatarUrl?:       string;
    },
  ) {
    await this.findOne(id);
    return this.prisma.driver.update({
      where: { id },
      data:  docs,
    });
  }
}