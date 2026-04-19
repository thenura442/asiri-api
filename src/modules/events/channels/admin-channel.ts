import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../../core/supabase/supabase.service';

@Injectable()
export class AdminChannel {
  private readonly logger = new Logger(AdminChannel.name);

  constructor(private supabase: SupabaseService) {}

  async publishNewJobRequest(job: {
    id: string;
    requestNumber: string;
    status: string;
    patientName: string;
    urgency: string;
  }) {
    try {
      await this.supabase.adminClient
        .channel('job_requests')
        .send({
          type: 'broadcast',
          event: 'new_request',
          payload: { ...job, timestamp: new Date().toISOString() },
        });
    } catch (err) {
      this.logger.warn(`Failed to publish new job request event: ${err}`);
    }
  }

  async publishJobStatusUpdate(
    jobId: string,
    requestNumber: string,
    status: string,
  ) {
    try {
      await this.supabase.adminClient
        .channel('job_requests')
        .send({
          type: 'broadcast',
          event: 'status_updated',
          payload: { jobId, requestNumber, status, timestamp: new Date().toISOString() },
        });
    } catch (err) {
      this.logger.warn(`Failed to publish job status update: ${err}`);
    }
  }

  async publishNewEscalation(escalation: {
    id: string;
    urgency: string;
    reasonCategory: string;
    details: string;
    jobRequestId?: string;
  }) {
    try {
      await this.supabase.adminClient
        .channel('escalations')
        .send({
          type: 'broadcast',
          event: 'new_escalation',
          payload: { ...escalation, timestamp: new Date().toISOString() },
        });
    } catch (err) {
      this.logger.warn(`Failed to publish escalation event: ${err}`);
    }
  }

  async publishNotification(
    userId: string,
    notification: {
      id: string;
      type: string;
      title: string;
      message: string;
    },
  ) {
    try {
      await this.supabase.adminClient
        .channel(`notifications:${userId}`)
        .send({
          type: 'broadcast',
          event: 'new_notification',
          payload: { ...notification, timestamp: new Date().toISOString() },
        });
    } catch (err) {
      this.logger.warn(`Failed to publish notification to user ${userId}: ${err}`);
    }
  }
}