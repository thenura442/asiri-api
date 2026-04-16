import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  // SMS provider (Twilio/Dialog) will be wired in when SMS_API_KEY is configured
  async sendOtp(phone: string, code: string): Promise<void> {
    this.logger.log(`OTP ${code} queued to ${phone}`);
  }

  async sendAlert(phone: string, message: string): Promise<void> {
    this.logger.log(`SMS alert queued to ${phone}: ${message}`);
  }
}