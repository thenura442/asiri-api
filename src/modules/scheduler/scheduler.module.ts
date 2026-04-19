import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { ExpireReservationsTask } from './tasks/expire-reservations.task';
import { AutoEscalateTask } from './tasks/auto-escalate.task';
import { LicenseExpiryTask } from './tasks/license-expiry.task';
import { PatientFlagUpdateTask } from './tasks/patient-flag-update.task';
import { SessionCleanupTask } from './tasks/session-cleanup.task';
import { ReportReminderTask } from './tasks/report-reminder.task';

@Module({
  providers: [
    SchedulerService,
    ExpireReservationsTask,
    AutoEscalateTask,
    LicenseExpiryTask,
    PatientFlagUpdateTask,
    SessionCleanupTask,
    ReportReminderTask,
  ],
  exports: [SchedulerService],
})
export class SchedulerModule {}