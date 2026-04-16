import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  // Firebase FCM will be wired in when firebase-service-account.json is configured
  async sendToDevice(token: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
    this.logger.log(`Push notification queued: ${title} → ${token.substring(0, 20)}...`);
  }

  async sendToMultiple(tokens: string[], title: string, body: string, data?: Record<string, string>): Promise<void> {
    this.logger.log(`Push notification queued to ${tokens.length} devices: ${title}`);
  }
}