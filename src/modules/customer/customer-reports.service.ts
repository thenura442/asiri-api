import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { StorageService } from '../../core/storage/storage.service';
import { STORAGE_BUCKETS } from '../../common/constants/storage-buckets.constant';

@Injectable()
export class CustomerReportsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async getReports(patientId: string) {
    // Only show reports for completed jobs
    return this.prisma.jobRequest.findMany({
      where: {
        patientId,
        status: 'completed',
      },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        requestNumber: true,
        completedAt: true,
        reportDownloadedAt: true,
        tests: {
          select: {
            id: true,
            reportUrl: true,
            isCriticalValue: true,
            test: { select: { name: true, code: true } },
          },
        },
      },
    });
  }

  async getReportDetail(jobId: string, patientId: string) {
    const job = await this.prisma.jobRequest.findFirst({
      where: { id: jobId, patientId, status: 'completed' },
      include: {
        tests: {
          include: { test: true },
        },
      },
    });

    if (!job) throw new NotFoundException('Report not found');

    // Mark as downloaded
    await this.prisma.jobRequest.update({
      where: { id: jobId },
      data: { reportDownloadedAt: new Date() },
    });

    // Generate signed URLs for each report
    const testsWithUrls = await Promise.all(
      job.tests.map(async (t) => {
        if (!t.reportUrl) return { ...t, signedUrl: null };
        const signedUrl = await this.storage.getSignedUrl(
          STORAGE_BUCKETS.LAB_REPORTS,
          t.reportUrl,
          3600,
        ).catch(() => null);
        return { ...t, signedUrl };
      }),
    );

    return { ...job, tests: testsWithUrls };
  }
}