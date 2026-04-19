import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../../core/supabase/supabase.service';

@Injectable()
export class CustomerChannel {
  private readonly logger = new Logger(CustomerChannel.name);

  constructor(private supabase: SupabaseService) {}

  async publishNotification(
    patientId: string,
    notification: {
      type: string;
      title: string;
      message: string;
    },
  ) {
    try {
      await this.supabase.adminClient
        .channel(`customer:${patientId}:notifications`)
        .send({
          type: 'broadcast',
          event: 'new_notification',
          payload: { ...notification, timestamp: new Date().toISOString() },
        });
    } catch (err) {
      this.logger.warn(
        `Failed to publish customer notification to ${patientId}: ${err}`,
      );
    }
  }

  async publishReportReady(
    patientId: string,
    jobId: string,
    requestNumber: string,
  ) {
    try {
      await this.supabase.adminClient
        .channel(`customer:${patientId}:reports`)
        .send({
          type: 'broadcast',
          event: 'report_ready',
          payload: {
            jobId,
            requestNumber,
            timestamp: new Date().toISOString(),
          },
        });
    } catch (err) {
      this.logger.warn(
        `Failed to publish report ready event to patient ${patientId}: ${err}`,
      );
    }
  }
}