import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class DriverHistoryService {
  constructor(private prisma: PrismaService) {}

  async getHistory(
    driverId: string,
    period: 'today' | 'week' | 'month' | 'all' = 'all',
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const now = new Date();

    let dateFrom: Date | undefined;
    switch (period) {
      case 'today':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const where: any = {
      driverId,
      status: { in: ['completed', 'cancelled', 'failed'] },
    };
    if (dateFrom) where.createdAt = { gte: dateFrom };

    // Stats
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [today, thisWeek, thisMonth, data, total] = await Promise.all([
      this.prisma.jobRequest.count({
        where: { driverId, status: 'completed', createdAt: { gte: todayStart } },
      }),
      this.prisma.jobRequest.count({
        where: { driverId, status: 'completed', createdAt: { gte: weekStart } },
      }),
      this.prisma.jobRequest.count({
        where: { driverId, status: 'completed', createdAt: { gte: monthStart } },
      }),
      this.prisma.jobRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { fullName: true } },
          tests: { include: { test: { select: { name: true } } } },
        },
      }),
      this.prisma.jobRequest.count({ where }),
    ]);

    return {
      stats: { today, thisWeek, thisMonth },
      jobs: data.map((job) => ({
        id: job.id,
        requestNumber: job.requestNumber,
        patientName: job.patient.fullName,
        testCount: job.tests.length,
        date: job.createdAt.toISOString(),
        status: job.status,
      })),
      meta: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + limit < total,
        hasPrev: page > 1,
      },
    };
  }
}