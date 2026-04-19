import { Injectable } from '@nestjs/common';
import { JobChannel } from './channels/job-channel';
import { AdminChannel } from './channels/admin-channel';
import { CustomerChannel } from './channels/customer-channel';
import { DriverChannel } from './channels/driver-channel';

@Injectable()
export class EventsService {
  constructor(
    public readonly job: JobChannel,
    public readonly admin: AdminChannel,
    public readonly customer: CustomerChannel,
    public readonly driver: DriverChannel,
  ) {}

  // Convenience method — called when job status changes
  async onJobStatusChanged(payload: {
    jobId: string;
    requestNumber: string;
    status: string;
    patientId?: string;
    driverId?: string;
  }) {
    // Notify admin portal
    await this.admin.publishJobStatusUpdate(
      payload.jobId,
      payload.requestNumber,
      payload.status,
    );

    // Notify customer tracking page
    await this.job.publishStatusChange(payload.jobId, payload.status);

    // Notify driver app
    if (payload.driverId) {
      await this.driver.publishStatusChanged(
        payload.driverId,
        payload.jobId,
        payload.status,
      );
    }
  }

  // Convenience method — called when report is ready
  async onReportReady(payload: {
    patientId: string;
    jobId: string;
    requestNumber: string;
    adminUserIds: string[];
  }) {
    // Notify customer
    await this.customer.publishReportReady(
      payload.patientId,
      payload.jobId,
      payload.requestNumber,
    );

    // Notify admin users
    for (const userId of payload.adminUserIds) {
      await this.admin.publishNotification(userId, {
        id: payload.jobId,
        type: 'report_ready',
        title: 'Report Ready',
        message: `Report for job ${payload.requestNumber} is ready for review`,
      });
    }
  }
}