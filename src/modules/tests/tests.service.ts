import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { FilterTestsDto } from './dto/filter-tests.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class TestsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTestDto) {
    // Check unique code
    const existing = await this.prisma.test.findFirst({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Test with code ${dto.code} already exists`,
      );
    }

    return this.prisma.test.create({
      data: {
        ...dto,
        isActive: true,
      },
    });
  }

  async findAll(dto: FilterTestsDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (dto.sampleType) where.sampleType = dto.sampleType;
    if (dto.isActive !== undefined) where.isActive = dto.isActive;
    if (dto.prescriptionReq !== undefined) where.prescriptionReq = dto.prescriptionReq;
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { code: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.test.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.test.count({ where }),
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
    const test = await this.prisma.test.findFirst({
      where: { id },
    });
    if (!test) throw new NotFoundException('Test not found');
    return test;
  }

  async update(id: string, dto: UpdateTestDto) {
    await this.findOne(id);

    // If code is being changed, check uniqueness
    if (dto.code) {
      const existing = await this.prisma.test.findFirst({
        where: { code: dto.code },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Test with code ${dto.code} already exists`,
        );
      }
    }

    return this.prisma.test.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // Check if test is used in any active jobs
    const activeJobs = await this.prisma.jobRequestTest.count({
      where: {
        testId: id,
        jobRequest: {
          status: {
            notIn: ['completed', 'cancelled', 'rejected', 'failed'],
          },
        },
      },
    });

    if (activeJobs > 0) {
      throw new BadRequestException(
        `Cannot delete test — it is used in ${activeJobs} active job(s)`,
      );
    }

    await this.prisma.test.delete({ where: { id } });
    return { message: 'Test deleted successfully' };
  }

  async toggleActive(id: string) {
    const test = await this.findOne(id);
    return this.prisma.test.update({
      where: { id },
      data: { isActive: !test.isActive },
    });
  }

  // Public catalog endpoint for mobile booking
  async getCatalog() {
    return this.prisma.test.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        price: true,
        sampleType: true,
        turnaroundTime: true,
        prescriptionReq: true,
        timeSensitivityHrs: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}