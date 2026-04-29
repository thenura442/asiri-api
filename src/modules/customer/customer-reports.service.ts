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
        tests: { include: { test: true } },
      },
    });

    if (!job) throw new NotFoundException('Report not found');

    const now = new Date();
    const isFirstDownload = !job.reportDownloadedAt;

    // Mark as downloaded
    await this.prisma.jobRequest.update({
      where: { id: jobId },
      data: { reportDownloadedAt: now },
    });

    // Advance timeline steps 20 and 21 on first download only
    if (isFirstDownload) {
      await this.advanceTimelineSteps(jobId, now);
    }

    // Generate signed URLs for each report
    const testsWithUrls = await Promise.all(
      job.tests.map(async (t) => {
        if (!t.reportUrl) return { ...t, signedUrl: null };
        const signedUrl = await this.storage
          .getSignedUrl(STORAGE_BUCKETS.LAB_REPORTS, t.reportUrl, 3600)
          .catch(() => null);
        return { ...t, signedUrl };
      }),
    );

    return { ...job, tests: testsWithUrls };
  }

  private async advanceTimelineSteps(jobId: string, now: Date): Promise<void> {
    // Step 20 — Report Downloaded
    await this.upsertTimelineStep(jobId, 20, 'Report Downloaded', 'Patient downloaded digital report', now);

    // Step 21 — Case Closed (auto immediately after download)
    await this.upsertTimelineStep(jobId, 21, 'Case Closed', 'All steps completed successfully', now);
  }

  private async upsertTimelineStep(
    jobId: string,
    stepNumber: number,
    title: string,
    description: string,
    timestamp: Date,
  ): Promise<void> {
    const existing = await this.prisma.jobTimeline.findFirst({
      where: { jobRequestId: jobId, stepNumber },
    });

    if (existing) {
      // Only update if not already marked done
      if (existing.status !== 'done') {
        await this.prisma.jobTimeline.update({
          where: { id: existing.id },
          data: { status: 'done', timestamp },
        });
      }
    } else {
      await this.prisma.jobTimeline.create({
        data: {
          jobRequestId: jobId,
          stepNumber,
          title,
          description,
          status: 'done',
          timestamp,
        },
      });
    }
  }
}