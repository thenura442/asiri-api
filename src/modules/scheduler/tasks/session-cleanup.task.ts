import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class SessionCleanupTask {
  private readonly logger = new Logger(SessionCleanupTask.name);

  constructor(
    private supabase: SupabaseService,
    private prisma: PrismaService,
  ) {}

  // Run every 6 hours
  @Cron('0 */6 * * *')
  async handle() {
    // Get session timeout from settings
    const setting = await this.prisma.setting.findUnique({
      where: { key: 'session_timeout_hours' },
    });
    const timeoutHours = parseInt(setting?.value ?? '24', 10);
    const cutoff = new Date(Date.now() - timeoutHours * 60 * 60 * 1000);

    // Reset failed login counts for accounts that were locked
    // and whose lockout period has expired
    const result = await this.prisma.user.updateMany({
      where: {
        lockedUntil: { lte: new Date() },
        failedLoginCount: { gt: 0 },
      },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Unlocked ${result.count} expired account lockout(s)`);
    }
  }
}