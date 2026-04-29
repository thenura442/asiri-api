import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { FilterPatientsDto } from './dto/filter-patients.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { calculateAge } from '../../common/utils/age-calculator.util';
import { UserRole } from '../../common/enums/role.enum';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePatientDto) {
    // Duplicate detection — NIC check (hard block)
    const existingNic = await this.prisma.patient.findFirst({
      where: { nic: dto.nic, deletedAt: null },
    });
    if (existingNic) {
      throw new BadRequestException({
        message: 'A patient with this NIC already exists',
        errorCode: 'DUP_NIC',
        existingPatient: {
          id: existingNic.id,
          fullName: existingNic.fullName,
          uhid: existingNic.uhid,
        },
      });
    }

    const existingPhone = await this.prisma.patient.findFirst({
      where: { phone: dto.phone, deletedAt: null },
    });
    if (existingPhone) {
      throw new BadRequestException({
        message: 'A patient with this phone number already exists',
        errorCode: 'DUP_PHONE_WARNING',
        existingPatient: {
          id: existingPhone.id,
          fullName: existingPhone.fullName,
          uhid: existingPhone.uhid,
          nic: existingPhone.nic,
        },
      });
    }

    // Set flagNewUntil to 2 weeks from now
    const flagNewUntil = new Date();
    flagNewUntil.setDate(flagNewUntil.getDate() + 14);

    return this.prisma.patient.create({
      data: {
        ...dto,
        dateOfBirth: new Date(dto.dateOfBirth),
        flag: 'new',
        flagNewUntil,
      },
    });
  }

  async findAll(dto: FilterPatientsDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (dto.flag) where.flag = dto.flag;
    if (dto.gender) where.gender = dto.gender;
    if (dto.district) where.district = { contains: dto.district, mode: 'insensitive' };
    if (dto.search) {
      where.OR = [
        { fullName: { contains: dto.search, mode: 'insensitive' } },
        { nic: { contains: dto.search, mode: 'insensitive' } },
        { phone: { contains: dto.search, mode: 'insensitive' } },
        { uhid: { contains: dto.search, mode: 'insensitive' } },
        { email: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: { jobRequests: true },
          },
        },
      }),
      this.prisma.patient.count({ where }),
    ]);

    // Add computed age to each patient
    const enriched = data.map((patient) => ({
      ...patient,
      age: calculateAge(patient.dateOfBirth),
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
    const patient = await this.prisma.patient.findFirst({
      where: { id },
      include: {
        jobRequests: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            requestNumber: true,
            status: true,
            createdAt: true,
            totalPrice: true,
          },
        },
        _count: {
          select: { jobRequests: true },
        },
      },
    });

    if (!patient) throw new NotFoundException('Patient not found');

    return {
      ...patient,
      age: calculateAge(patient.dateOfBirth),
    };
  }

  async update(id: string, dto: UpdatePatientDto, userRole: string) {
    await this.findOne(id);

    // Only SA and LM can set blacklisted flag
    if (
      dto.flag === 'blacklisted' &&
      ![UserRole.SUPER_ADMIN, UserRole.LAB_MANAGER].includes(userRole as UserRole)
    ) {
      throw new BadRequestException(
        'Only Super Admin or Lab Manager can blacklist a patient',
      );
    }

    const data: any = { ...dto };
    if (dto.dateOfBirth) {
      data.dateOfBirth = new Date(dto.dateOfBirth);
    }

    return this.prisma.patient.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const activeJobs = await this.prisma.jobRequest.count({
      where: {
        patientId: id,
        status: { notIn: ['completed', 'cancelled', 'rejected', 'failed'] },
      },
    });

    if (activeJobs > 0) {
      throw new BadRequestException(
        `Cannot delete patient with ${activeJobs} active job(s)`,
      );
    }

    await this.prisma.patient.delete({ where: { id } });
    return { message: 'Patient deleted successfully' };
  }

  async assignUhid(id: string, uhid: string) {
    await this.findOne(id);

    // Check UHID uniqueness
    const existing = await this.prisma.patient.findFirst({
      where: { uhid },
    });
    if (existing && existing.id !== id) {
      throw new BadRequestException('This UHID is already assigned to another patient');
    }

    return this.prisma.patient.update({
      where: { id },
      data: { uhid },
    });
  }

  async updateFlag(id: string, flag: string, userRole: string) {
    if (
      flag === 'blacklisted' &&
      ![UserRole.SUPER_ADMIN, UserRole.LAB_MANAGER].includes(userRole as UserRole)
    ) {
      throw new BadRequestException(
        'Only Super Admin or Lab Manager can blacklist a patient',
      );
    }

    await this.findOne(id);
    return this.prisma.patient.update({
      where: { id },
      data: { flag: flag as any },
    });
  }
}