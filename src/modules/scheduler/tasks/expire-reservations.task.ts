import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ExpireReservationsTask {
  private readonly logger = new Logger(ExpireReservationsTask.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handle() {
    // Cancel jobs stuck in pending for more than 5 minutes with no branch
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const expired = await this.prisma.jobRequest.findMany({
      where: {
        status: 'pending',
        branchId: null,
        createdAt: { lt: fiveMinutesAgo },
      },
      select: { id: true },
    });

    if (expired.length === 0) return;

    await this.prisma.jobRequest.updateMany({
      where: { id: { in: expired.map((j) => j.id) } },
      data: { status: 'queued' },
    });

    this.logger.log(
      `Moved ${expired.length} unassigned pending job(s) to queued`,
    );
  }
}