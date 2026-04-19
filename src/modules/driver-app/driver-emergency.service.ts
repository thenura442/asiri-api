import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { EmailService } from '../../core/email/email.service';
import { EventsService } from '../events/events.service';
import { EmergencyAlertDto } from './dto/emergency-alert.dto';

@Injectable()
export class DriverEmergencyService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private events: EventsService,
  ) {}

  async sendEmergencyAlert(driverId: string, dto: EmergencyAlertDto) {
    const driver = await this.prisma.driver.findFirst({
      where: { id: driverId },
      select: { fullName: true, phone: true, branchId: true },
    });

    // Create escalation
    const superAdmin = await this.prisma.user.findFirst({
      where: { role: 'super_admin', status: 'active' },
      select: { id: true },
    });

    const escalation = await this.prisma.escalation.create({
      data: {
        jobRequestId: dto.jobRequestId,
        escalatedBy: superAdmin!.id,
        reasonCategory: 'driver_issue',
        details: `EMERGENCY from driver ${driver?.fullName}: ${dto.details}`,
        urgency: 'critical',
        status: 'open',
      },
    });

    // Email all super admins
    const superAdmins = await this.prisma.user.findMany({
      where: { role: 'super_admin', status: 'active' },
      select: { email: true },
    });

    await Promise.all(
      superAdmins.map((sa) =>
        this.email.sendEscalationAlert(
          sa.email,
          `🚨 EMERGENCY ALERT from driver ${driver?.fullName} (${driver?.phone}): ${dto.details}`,
        ),
      ),
    );

    // Publish realtime alert
    await this.events.admin.publishNewEscalation({
      id: escalation.id,
      urgency: 'critical',
      reasonCategory: 'driver_issue',
      details: dto.details,
      jobRequestId: dto.jobRequestId,
    });

    return { message: 'Emergency alert sent to all super admins' };
  }
}