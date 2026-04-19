import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../../core/supabase/supabase.service';

@Injectable()
export class DriverChannel {
  private readonly logger = new Logger(DriverChannel.name);

  constructor(private supabase: SupabaseService) {}

  async publishNewAssignment(
    driverId: string,
    job: {
      id: string;
      requestNumber: string;
      address: string;
      patientName: string;
      urgency: string;
    },
  ) {
    try {
      await this.supabase.adminClient
        .channel(`driver:${driverId}:job`)
        .send({
          type: 'broadcast',
          event: 'new_assignment',
          payload: { ...job, timestamp: new Date().toISOString() },
        });
    } catch (err) {
      this.logger.warn(
        `Failed to publish assignment to driver ${driverId}: ${err}`,
      );
    }
  }

  async publishJobCancelled(driverId: string, jobId: string, reason: string) {
    try {
      await this.supabase.adminClient
        .channel(`driver:${driverId}:job`)
        .send({
          type: 'broadcast',
          event: 'job_cancelled',
          payload: { jobId, reason, timestamp: new Date().toISOString() },
        });
    } catch (err) {
      this.logger.warn(
        `Failed to publish job cancellation to driver ${driverId}: ${err}`,
      );
    }
  }

  async publishStatusChanged(
    driverId: string,
    jobId: string,
    status: string,
  ) {
    try {
      await this.supabase.adminClient
        .channel(`driver:${driverId}:job`)
        .send({
          type: 'broadcast',
          event: 'status_changed',
          payload: { jobId, status, timestamp: new Date().toISOString() },
        });
    } catch (err) {
      this.logger.warn(
        `Failed to publish status change to driver ${driverId}: ${err}`,
      );
    }
  }

  async publishNotification(
    driverId: string,
    notification: {
      type: string;
      title: string;
      message: string;
    },
  ) {
    try {
      await this.supabase.adminClient
        .channel(`driver:${driverId}:notifications`)
        .send({
          type: 'broadcast',
          event: 'new_notification',
          payload: { ...notification, timestamp: new Date().toISOString() },
        });
    } catch (err) {
      this.logger.warn(
        `Failed to publish notification to driver ${driverId}: ${err}`,
      );
    }
  }
}