import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../../core/supabase/supabase.service';

@Injectable()
export class JobChannel {
  private readonly logger = new Logger(JobChannel.name);

  constructor(private supabase: SupabaseService) {}

  async publishStatusChange(
    jobId: string,
    status: string,
    metadata?: Record<string, any>,
  ) {
    try {
      await this.supabase.adminClient
        .channel(`booking:${jobId}`)
        .send({
          type: 'broadcast',
          event: 'status_changed',
          payload: { jobId, status, timestamp: new Date().toISOString(), ...metadata },
        });
    } catch (err) {
      this.logger.warn(`Failed to publish status change for job ${jobId}: ${err}`);
    }
  }

  async publishDriverLocation(
    jobId: string,
    driverId: string,
    latitude: number,
    longitude: number,
    etaMinutes?: number,
  ) {
    try {
      await this.supabase.adminClient
        .channel(`booking:${jobId}`)
        .send({
          type: 'broadcast',
          event: 'driver_location',
          payload: {
            jobId,
            driverId,
            latitude,
            longitude,
            etaMinutes,
            timestamp: new Date().toISOString(),
          },
        });
    } catch (err) {
      this.logger.warn(`Failed to publish driver location for job ${jobId}: ${err}`);
    }
  }

  async publishEtaUpdate(jobId: string, etaMinutes: number) {
    try {
      await this.supabase.adminClient
        .channel(`booking:${jobId}`)
        .send({
          type: 'broadcast',
          event: 'eta_updated',
          payload: { jobId, etaMinutes, timestamp: new Date().toISOString() },
        });
    } catch (err) {
      this.logger.warn(`Failed to publish ETA update for job ${jobId}: ${err}`);
    }
  }
}