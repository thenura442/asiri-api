import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { ReceiveSamplesDto } from './dto/receive-samples.dto';
import { ReportIssueDto } from './dto/report-issue.dto';
import { UploadReportDto } from './dto/upload-report.dto';
import { FilterLabDto } from './dto/filter-lab.dto';
import { UserRole } from '../../common/enums/role.enum';

@Injectable()
export class LabService {
  constructor(private prisma: PrismaService) {}

  async getApprovals(dto: FilterLabDto, user: any) {
    const { page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;

    const where: any = {
      status: { in: ['lab_received', 'processing', 'report_ready', 'report_reviewed'] },
    };

    // LM and LT only see their lab's jobs
    if (
      [UserRole.LAB_MANAGER, UserRole.LAB_TECHNICIAN].includes(user.role)
    ) {
      where.labId = user.branchId;
    } else if (dto.labId) {
      where.labId = dto.labId;
    }

    if (dto.status) where.status = dto.status;
    if (dto.search) {
      where.OR = [
        { requestNumber: { contains: dto.search, mode: 'insensitive' } },
        { patient: { fullName: { contains: dto.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.jobRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { id: true, fullName: true, uhid: true } },
          lab: { select: { id: true, name: true } },
          tests: {
            include: { test: { select: { id: true, name: true, code: true } } },
          },
        },
      }),
      this.prisma.jobRequest.count({ where }),
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

  async receiveSamples(jobId: string, dto: ReceiveSamplesDto, userId: string) {
    const job = await this.prisma.jobRequest.findFirst({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Job request not found');

    // Mark selected tests as received
    await this.prisma.jobRequestTest.updateMany({
      where: { id: { in: dto.jobRequestTestIds }, jobRequestId: jobId },
      data: {
        status: 'received_at_lab',
        labReceived: true,
        labReceivedAt: new Date(),
      },
    });

    // Update job status to lab_received
    await this.prisma.jobRequest.update({
      where: { id: jobId },
      data: { status: 'lab_received' },
    });

    return { message: 'Samples marked as received' };
  }

  async reportIssue(jobId: string, dto: ReportIssueDto, userId: string) {
    const test = await this.prisma.jobRequestTest.findFirst({
      where: { id: dto.jobRequestTestId, jobRequestId: jobId },
    });
    if (!test) throw new NotFoundException('Job request test not found');

    return this.prisma.jobRequestTest.update({
      where: { id: dto.jobRequestTestId },
      data: {
        status: 'failed',
        collectionNotes: dto.notes,
      },
    });
  }

  async uploadReport(jobId: string, dto: UploadReportDto, userId: string) {
    const test = await this.prisma.jobRequestTest.findFirst({
      where: { id: dto.jobRequestTestId, jobRequestId: jobId },
    });
    if (!test) throw new NotFoundException('Job request test not found');

    const updated = await this.prisma.jobRequestTest.update({
      where: { id: dto.jobRequestTestId },
      data: {
        reportUrl: dto.reportUrl,
        status: 'complete',
        isCriticalValue: dto.isCriticalValue ?? false,
      },
    });

    // Check if all tests are complete
    const pendingTests = await this.prisma.jobRequestTest.count({
      where: { jobRequestId: jobId, status: { notIn: ['complete', 'failed'] } },
    });

    if (pendingTests === 0) {
      await this.prisma.jobRequest.update({
        where: { id: jobId },
        data: { status: 'report_ready' },
      });
    }

    return updated;
  }

  async reviewReport(jobId: string, userId: string) {
    const job = await this.prisma.jobRequest.findFirst({
      where: { id: jobId, status: 'report_ready' },
    });
    if (!job) throw new NotFoundException('Job not found or not in report_ready status');

    return this.prisma.jobRequest.update({
      where: { id: jobId },
      data: {
        status: 'report_reviewed',
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
    });
  }
}