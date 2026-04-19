import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { EmailService } from '../../core/email/email.service';
import { CreateEscalationDto } from './dto/create-escalation.dto';
import { ResolveEscalationDto } from './dto/resolve-escalation.dto';
import { FilterEscalationsDto } from './dto/filter-escalations.dto';
import { EscalationUrgency } from '../../common/enums/escalation-urgency.enum';

@Injectable()
export class EscalationsService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  async create(dto: CreateEscalationDto, userId: string) {
    const escalation = await this.prisma.escalation.create({
      data: {
        jobRequestId: dto.jobRequestId,
        escalatedBy: userId,
        reasonCategory: dto.reasonCategory,
        details: dto.details,
        urgency: dto.urgency ?? 'normal',
        status: 'open',
      },
      include: {
        escalator: { select: { id: true, fullName: true, role: true } },
        jobRequest: { select: { id: true, requestNumber: true } },
      },
    });

    // If critical — email all super admins
    if (dto.urgency === EscalationUrgency.CRITICAL) {
      const superAdmins = await this.prisma.user.findMany({
        where: { role: 'super_admin', status: 'active' },
        select: { email: true, fullName: true },
      });

      await Promise.all(
        superAdmins.map((sa) =>
          this.email.sendEscalationAlert(
            sa.email,
            `CRITICAL ESCALATION: ${dto.details}`,
          ),
        ),
      );
    }

    return escalation;
  }

  async findAll(dto: FilterEscalationsDto) {
    const { page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (dto.urgency) where.urgency = dto.urgency;
    if (dto.status) where.status = dto.status;
    if (dto.search) {
      where.OR = [
        { details: { contains: dto.search, mode: 'insensitive' } },
        { jobRequest: { requestNumber: { contains: dto.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.escalation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          escalator: { select: { id: true, fullName: true, role: true } },
          resolver: { select: { id: true, fullName: true } },
          jobRequest: { select: { id: true, requestNumber: true, status: true } },
        },
      }),
      this.prisma.escalation.count({ where }),
    ]);

    return {
      data,
      meta: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async acknowledge(id: string, userId: string) {
    const escalation = await this.prisma.escalation.findFirst({
      where: { id },
    });
    if (!escalation) throw new NotFoundException('Escalation not found');

    return this.prisma.escalation.update({
      where: { id },
      data: { status: 'acknowledged' },
    });
  }

  async resolve(id: string, dto: ResolveEscalationDto, userId: string) {
    const escalation = await this.prisma.escalation.findFirst({
      where: { id },
    });
    if (!escalation) throw new NotFoundException('Escalation not found');

    return this.prisma.escalation.update({
      where: { id },
      data: {
        status: 'resolved',
        resolvedBy: userId,
        resolutionNotes: dto.resolutionNotes,
        resolvedAt: new Date(),
      },
    });
  }
}