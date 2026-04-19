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

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDriverDto) {
    // Drivers only at lab-type branches
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId },
    });
    if (!branch) throw new BadRequestException('Branch not found');
    if (branch.type !== 'lab') {
      throw new BadRequestException(
        'Drivers can only be assigned to lab-type branches',
      );
    }

    return this.prisma.driver.create({
      data: {
        ...dto,
        licenseExpiry: new Date(dto.licenseExpiry),
        status: 'active',
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

    const where: any = {};
    if (dto.status) where.status = dto.status;
    if (dto.branchId) where.branchId = dto.branchId;
    if (!isSuperAdmin && userBranchId) where.branchId = userBranchId;
    if (dto.search) {
      where.OR = [
        { fullName: { contains: dto.search, mode: 'insensitive' } },
        { nic: { contains: dto.search, mode: 'insensitive' } },
        { licenseNumber: { contains: dto.search, mode: 'insensitive' } },
        { phone: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    // License expiry warning — flag drivers expiring within 30 days
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
          vehicles: {
            select: { id: true, plateNumber: true, vehicleIdCode: true },
            where: { deletedAt: null },
          },
        },
      }),
      this.prisma.driver.count({ where }),
    ]);

    // Add licenseExpiryWarning flag to each driver
    const enriched = data.map((driver) => ({
      ...driver,
      licenseExpiryWarning: driver.licenseExpiry <= thirtyDaysFromNow,
    }));

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
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        vehicles: {
          select: { id: true, plateNumber: true, vehicleIdCode: true },
          where: { deletedAt: null },
        },
        driverSettings: true,
      },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return {
      ...driver,
      licenseExpiryWarning: driver.licenseExpiry <= thirtyDaysFromNow,
    };
  }

  async update(id: string, dto: UpdateDriverDto) {
    await this.findOne(id);

    const data: any = { ...dto };
    if (dto.licenseExpiry) {
      data.licenseExpiry = new Date(dto.licenseExpiry);
    }

    return this.prisma.driver.update({
      where: { id },
      data,
      include: {
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: string) {
    const driver = await this.findOne(id);

    // Check for active jobs
    const activeJobs = await this.prisma.jobRequest.count({
      where: {
        driverId: id,
        status: {
          notIn: ['completed', 'cancelled', 'rejected', 'failed'],
        },
      },
    });

    if (activeJobs > 0) {
      throw new BadRequestException(
        `Cannot delete driver with ${activeJobs} active job(s)`,
      );
    }

    // Unassign from any vehicles
    await this.prisma.vehicle.updateMany({
      where: { currentDriverId: id },
      data: { currentDriverId: null },
    });

    await this.prisma.driver.delete({ where: { id } });
    return { message: 'Driver deleted successfully' };
  }

  async updateDocuments(
    id: string,
    docs: {
      licenseDocUrl?: string;
      nicFrontUrl?: string;
      nicBackUrl?: string;
      avatarUrl?: string;
    },
  ) {
    await this.findOne(id);
    return this.prisma.driver.update({
      where: { id },
      data: docs,
    });
  }
}