import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class CustomerNotificationsService {
  constructor(private prisma: PrismaService) {}

  async getNotifications(patientId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    // Get job-based notifications for customer
    const [jobs, total] = await Promise.all([
      this.prisma.jobRequest.findMany({
        where: { patientId },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          requestNumber: true,
          status: true,
          updatedAt: true,
          urgency: true,
        },
      }),
      this.prisma.jobRequest.count({ where: { patientId } }),
    ]);

    const notifications = jobs.map((job) => ({
      id: job.id,
      type: this.getNotificationType(job.status),
      title: this.getNotificationTitle(job.status, job.requestNumber),
      message: this.getNotificationMessage(job.status),
      jobRequestId: job.id,
      isRead: false,
      createdAt: job.updatedAt.toISOString(),
    }));

    const unreadCount = notifications.length;

    return {
      unreadCount,
      notifications,
      meta: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async markRead(notificationId: string, patientId: string) {
    // In production, use a dedicated notifications table for customers
    return { success: true };
  }

  async markAllRead(patientId: string) {
    return { success: true, message: 'All notifications marked as read' };
  }

  private getNotificationType(status: string): string {
    if (status === 'completed') return 'job_completed';
    if (status === 'report_ready') return 'report_ready';
    if (status === 'cancelled') return 'cancellation';
    return 'new_request';
  }

  private getNotificationTitle(status: string, requestNumber: string): string {
    const statusMap: Record<string, string> = {
      pending: `Request ${requestNumber} Received`,
      accepted: `Request ${requestNumber} Accepted`,
      allocated: `Driver Assigned`,
      dispatched: `Driver On The Way`,
      en_route: `Driver En Route`,
      arrived: `Driver Arrived`,
      collecting: `Sample Collection Started`,
      collected: `Samples Collected`,
      report_ready: `Your Report is Ready`,
      completed: `Booking Complete`,
      cancelled: `Booking Cancelled`,
    };
    return statusMap[status] ?? `Update for ${requestNumber}`;
  }

  private getNotificationMessage(status: string): string {
    const msgMap: Record<string, string> = {
      pending: 'Your request is being processed.',
      accepted: 'A branch has accepted your request.',
      allocated: 'A driver has been assigned to your request.',
      dispatched: 'Your driver has departed.',
      en_route: 'Your driver is on the way to your location.',
      arrived: 'Your driver has arrived at your location.',
      collecting: 'Sample collection is in progress.',
      collected: 'Your samples have been collected successfully.',
      report_ready: 'Your lab report is ready. Open the app to download.',
      completed: 'Your booking has been completed.',
      cancelled: 'Your booking has been cancelled.',
    };
    return msgMap[status] ?? 'Your booking status has been updated.';
  }
}