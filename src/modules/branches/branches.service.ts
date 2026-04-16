import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { FilterBranchesDto } from './dto/filter-branches.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { BranchType } from '../../common/enums/branch-type.enum';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBranchDto) {
    // Validate: collecting_center must have a defaultLabId
    if (dto.type === BranchType.COLLECTING_CENTER && !dto.defaultLabId) {
      throw new BadRequestException(
        'Collecting centers must have a default lab assigned',
      );
    }

    // Validate: defaultLabId must point to a lab-type branch
    if (dto.defaultLabId) {
      const lab = await this.prisma.branch.findFirst({
        where: { id: dto.defaultLabId, type: 'lab' },
      });
      if (!lab) throw new BadRequestException('defaultLabId must point to a lab-type branch');
    }

    const branch = await this.prisma.branch.create({
      data: {
        ...dto,
        // For lab-type branches, defaultLabId is set to own id after creation
        defaultLabId: dto.type === BranchType.LAB ? undefined : dto.defaultLabId,
      },
    });

    // Auto-set defaultLabId for lab-type branches
    if (dto.type === BranchType.LAB) {
      return this.prisma.branch.update({
        where: { id: branch.id },
        data: { defaultLabId: branch.id },
      });
    }

    return branch;
  }

  async findAll(dto: FilterBranchesDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (dto.type) where.type = dto.type;
    if (dto.isOnline !== undefined) where.isOnline = dto.isOnline;
    if (dto.province) where.province = { contains: dto.province, mode: 'insensitive' };
    if (dto.district) where.district = { contains: dto.district, mode: 'insensitive' };
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { branchCode: { contains: dto.search, mode: 'insensitive' } },
        { address: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              users: true,
              vehicles: true,
              drivers: true,
            },
          },
        },
      }),
      this.prisma.branch.count({ where }),
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
      },
    };
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id },
      include: {
        defaultLab: { select: { id: true, name: true } },
        _count: {
          select: {
            users: true,
            vehicles: true,
            drivers: true,
          },
        },
      },
    });

    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async update(id: string, dto: UpdateBranchDto) {
    await this.findOne(id);

    if (dto.defaultLabId) {
      const lab = await this.prisma.branch.findFirst({
        where: { id: dto.defaultLabId, type: 'lab' },
      });
      if (!lab) throw new BadRequestException('defaultLabId must point to a lab-type branch');
    }

    return this.prisma.branch.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const branch = await this.findOne(id);

    // Check for active jobs before deleting
    const activeJobs = await this.prisma.jobRequest.count({
      where: {
        branchId: id,
        status: { notIn: ['completed', 'cancelled', 'rejected', 'failed'] },
      },
    });

    if (activeJobs > 0) {
      throw new BadRequestException(
        `Cannot delete branch with ${activeJobs} active job(s)`,
      );
    }

    await this.prisma.branch.delete({ where: { id } });
    return { message: 'Branch deleted successfully' };
  }

  async toggleOnline(id: string) {
    const branch = await this.findOne(id);

    // Cannot go offline if active dispatched jobs exist
    if (branch.isOnline) {
      const activeJobs = await this.prisma.jobRequest.count({
        where: {
          branchId: id,
          status: { in: ['accepted', 'allocated', 'dispatched', 'en_route'] },
        },
      });

      if (activeJobs > 0) {
        throw new BadRequestException(
          `Cannot go offline — ${activeJobs} active job(s) in progress`,
        );
      }
    }

    return this.prisma.branch.update({
      where: { id },
      data: { isOnline: !branch.isOnline },
    });
  }

  async getLabsDropdown() {
    return this.prisma.branch.findMany({
      where: { type: 'lab', isOnline: true },
      select: { id: true, name: true, branchCode: true, district: true },
      orderBy: { name: 'asc' },
    });
  }
}