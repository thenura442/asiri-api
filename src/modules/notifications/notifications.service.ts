import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { FilterNotificationsDto } from './dto/filter-notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(dto: FilterNotificationsDto, userId: string) {
    const { page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (dto.isRead !== undefined) where.isRead = dto.isRead;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          jobRequest: {
            select: { id: true, requestNumber: true, status: true },
          },
        },
      }),
      this.prisma.notification.count({ where }),
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

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { message: 'All notifications marked as read' };
  }

  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    jobRequestId?: string;
    sentBy?: string;
  }) {
    return this.prisma.notification.create({
      data: data as any,
    });
  }
}