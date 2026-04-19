import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../core/database/prisma.service';
import { EmailService } from '../../../core/email/email.service';

@Injectable()
export class LicenseExpiryTask {
  private readonly logger = new Logger(LicenseExpiryTask.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  // Run daily at 6:00 AM
  @Cron('0 6 * * *')
  async handle() {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringDrivers = await this.prisma.driver.findMany({
      where: {
        status: 'active',
        licenseExpiry: { lte: thirtyDaysFromNow },
      },
      include: {
        branch: { select: { name: true } },
      },
    });

    if (expiringDrivers.length === 0) return;

    // Notify super admins
    const superAdmins = await this.prisma.user.findMany({
      where: { role: 'super_admin', status: 'active' },
      select: { email: true },
    });

    const driverList = expiringDrivers
      .map(
        (d) =>
          `${d.fullName} (${d.branch.name}) — expires ${d.licenseExpiry.toDateString()}`,
      )
      .join('\n');

    await Promise.all(
      superAdmins.map((sa) =>
        this.email.sendEmail(
          sa.email,
          `⚠️ ${expiringDrivers.length} Driver License(s) Expiring Soon`,
          `<h2>License Expiry Warning</h2><pre>${driverList}</pre>`,
        ),
      ),
    );

    this.logger.log(
      `License expiry alert sent for ${expiringDrivers.length} driver(s)`,
    );
  }
}