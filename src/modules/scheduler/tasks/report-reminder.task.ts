import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../core/database/prisma.service';
import { EmailService } from '../../../core/email/email.service';

@Injectable()
export class ReportReminderTask {
  private readonly logger = new Logger(ReportReminderTask.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  // Run daily at 9:00 AM
  @Cron('0 9 * * *')
  async handle() {
    // Get reminder days from settings (e.g. "1,3,7")
    const setting = await this.prisma.setting.findUnique({
      where: { key: 'report_reminder_days' },
    });
    const reminderDays = (setting?.value ?? '1,3,7')
      .split(',')
      .map((d) => parseInt(d.trim(), 10));

    for (const days of reminderDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - days);
      targetDate.setHours(0, 0, 0, 0);

      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Find completed jobs where report hasn't been downloaded
      const jobs = await this.prisma.jobRequest.findMany({
        where: {
          status: 'completed',
          completedAt: { gte: targetDate, lt: nextDay },
          reportDownloadedAt: null,
        },
        include: {
          patient: { select: { email: true, fullName: true } },
        },
      });

      for (const job of jobs) {
        if (!job.patient.email) continue;

        await this.email.sendEmail(
          job.patient.email,
          'Your Lab Report is Ready — Asiri Laboratories',
          `
            <h2>Hello ${job.patient.fullName},</h2>
            <p>Your lab report for request <strong>${job.requestNumber}</strong> is ready.</p>
            <p>Please log in to the Asiri mobile app to download your report.</p>
          `,
        );
      }

      if (jobs.length > 0) {
        this.logger.log(
          `Sent report reminders for ${jobs.length} job(s) completed ${days} day(s) ago`,
        );
      }
    }
  }
}