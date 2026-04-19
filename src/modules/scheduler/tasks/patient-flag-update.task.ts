import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class PatientFlagUpdateTask {
  private readonly logger = new Logger(PatientFlagUpdateTask.name);

  constructor(private prisma: PrismaService) {}

  // Run daily at midnight
  @Cron('0 0 * * *')
  async handle() {
    const now = new Date();

    // Update patients whose flagNewUntil has passed
    const result = await this.prisma.patient.updateMany({
      where: {
        flag: 'new',
        flagNewUntil: { lte: now },
      },
      data: { flag: 'regular' },
    });

    if (result.count > 0) {
      this.logger.log(
        `Updated ${result.count} patient(s) from 'new' to 'regular'`,
      );
    }
  }
}