import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { FilterVehiclesDto } from './dto/filter-vehicles.dto';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  // Converts ISO date strings → Date objects for Prisma
  private buildData(dto: CreateVehicleDto | UpdateVehicleDto) {
    const { insuranceExpiry, revenueLicExpiry, lastServiceDate, ...rest } = dto as any;
    const data: any = { ...rest };
    if (insuranceExpiry) data.insuranceExpiry = new Date(insuranceExpiry);
    if (revenueLicExpiry) data.revenueLicExpiry = new Date(revenueLicExpiry);
    if (lastServiceDate) data.lastServiceDate = new Date(lastServiceDate);
    return data;
  }

  async create(dto: CreateVehicleDto) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId },
    });
    if (!branch) throw new BadRequestException('Branch not found');
    if (branch.type !== 'lab') {
      throw new BadRequestException(
        'Vehicles can only be assigned to lab-type branches',
      );
    }

    return this.prisma.vehicle.create({
      data: this.buildData(dto),
      include: {
        branch: { select: { id: true, name: true } },
        currentDriver: { select: { id: true, fullName: true } },
      },
    });
  }

  async findAll(
    dto: FilterVehiclesDto,
    userBranchId?: string,
    isSuperAdmin?: boolean,
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (dto.status) where.status = dto.status;
    if (dto.vehicleType) where.vehicleType = dto.vehicleType;
    if (dto.branchId) where.branchId = dto.branchId;
    if (!isSuperAdmin && userBranchId) where.branchId = userBranchId;
    if (dto.search) {
      where.OR = [
        { plateNumber: { contains: dto.search, mode: 'insensitive' } },
        { chassisNumber: { contains: dto.search, mode: 'insensitive' } },
        { vehicleIdCode: { contains: dto.search, mode: 'insensitive' } },
        { makeModel: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [data, total, available, busy, offline] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          branch: { select: { id: true, name: true } },
          currentDriver: { select: { id: true, fullName: true, phone: true } },
        },
      }),
      this.prisma.vehicle.count({ where }),
      this.prisma.vehicle.count({ where: { ...where, status: 'available' } }),
      this.prisma.vehicle.count({ where: { ...where, status: 'busy' } }),
      this.prisma.vehicle.count({ where: { ...where, status: 'offline' } }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + limit < total,
        hasPrev: page > 1,
        stats: { available, busy, offline },
      },
    };
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        currentDriver: { select: { id: true, fullName: true, phone: true } },
      },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findOne(id);
    return this.prisma.vehicle.update({
      where: { id },
      data: this.buildData(dto),
      include: {
        branch: { select: { id: true, name: true } },
        currentDriver: { select: { id: true, fullName: true } },
      },
    });
  }

  async remove(id: string) {
    const vehicle = await this.findOne(id);

    if (vehicle.status === 'busy') {
      throw new BadRequestException(
        'Cannot delete a vehicle that is currently busy',
      );
    }

    await this.prisma.vehicle.delete({ where: { id } });
    return { message: 'Vehicle deleted successfully' };
  }

  async assignDriver(id: string, dto: AssignDriverDto) {
    await this.findOne(id);

    if (dto.driverId) {
      const driver = await this.prisma.driver.findFirst({
        where: { id: dto.driverId },
      });
      if (!driver) throw new NotFoundException('Driver not found');
      if (driver.status !== 'active') {
        throw new BadRequestException('Driver must be active to be assigned');
      }
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: { currentDriverId: dto.driverId ?? null },
      include: {
        branch: { select: { id: true, name: true } },
        currentDriver: { select: { id: true, fullName: true, phone: true } },
      },
    });
  }
}