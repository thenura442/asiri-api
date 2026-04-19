import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../core/database/prisma.service';
import { EmailService } from '../../../core/email/email.service';

@Injectable()
export class AutoEscalateTask {
  private readonly logger = new Logger(AutoEscalateTask.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handle() {
    // Get assignment timeout from settings
    const setting = await this.prisma.setting.findUnique({
      where: { key: 'assignment_timeout_seconds' },
    });
    const timeoutSeconds = parseInt(setting?.value ?? '120', 10);
    const cutoff = new Date(Date.now() - timeoutSeconds * 1000);

    // Find queued jobs older than timeout with no escalation yet
    const unassigned = await this.prisma.jobRequest.findMany({
      where: {
        status: 'queued',
        createdAt: { lt: cutoff },
        escalations: { none: {} },
      },
      select: { id: true, requestNumber: true },
    });

    if (unassigned.length === 0) return;

    // Get all super admins
    const superAdmins = await this.prisma.user.findMany({
      where: { role: 'super_admin', status: 'active' },
      select: { id: true, email: true, fullName: true },
    });

    if (superAdmins.length === 0) return;

    for (const job of unassigned) {
      // Create escalation
      await this.prisma.escalation.create({
        data: {
          jobRequestId: job.id,
          escalatedBy: superAdmins[0].id,
          reasonCategory: 'other',
          details: `Job ${job.requestNumber} unassigned for over ${timeoutSeconds / 60} minutes — auto-escalated`,
          urgency: 'urgent',
          status: 'open',
        },
      });

      // Email all SAs
      await Promise.all(
        superAdmins.map((sa) =>
          this.email.sendEscalationAlert(
            sa.email,
            `Job ${job.requestNumber} has been unassigned for over ${timeoutSeconds / 60} minutes and requires immediate attention.`,
          ),
        ),
      );

      this.logger.warn(
        `Auto-escalated job ${job.requestNumber} — no branch after ${timeoutSeconds}s`,
      );
    }
  }
}