import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class DriverNotificationsService {
  constructor(private prisma: PrismaService) {}

  async getNotifications(driverId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    // Get driver's linked user (branch staff) — for now use driver ID as reference
    // Notifications for drivers are stored linked to escalations/job events
    const activeJobs = await this.prisma.jobRequest.findMany({
      where: {
        driverId,
        updatedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // last 30 days
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip,
      select: {
        id: true,
        requestNumber: true,
        status: true,
        updatedAt: true,
        urgency: true,
      },
    });

    const total = await this.prisma.jobRequest.count({
      where: { driverId },
    });

    // Map job updates to notification format
    const notifications = activeJobs.map((job) => ({
      id: job.id,
      type: 'new_request' as const,
      title: `Job ${job.requestNumber}`,
      message: `Status updated to ${job.status.replace(/_/g, ' ')}`,
      jobRequestId: job.id,
      isRead: false,
      createdAt: job.updatedAt.toISOString(),
    }));

    return {
      unreadCount: notifications.length,
      notifications,
      meta: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + limit < total,
        hasPrev: page > 1,
      },
    };
  }
}