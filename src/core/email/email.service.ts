import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService) {}

  async sendEmail(to: string, subject: string, htmlContent: string): Promise<void> {
    // Brevo SDK will be wired in when BREVO_API_KEY is configured
    this.logger.log(`Email queued to ${to}: ${subject}`);
  }

  async sendPasswordReset(to: string, resetLink: string): Promise<void> {
    const html = `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
    `;
    await this.sendEmail(to, 'Reset Your Password — Asiri Laboratories', html);
  }

  async sendWelcome(to: string, fullName: string): Promise<void> {
    const html = `
      <h2>Welcome, ${fullName}!</h2>
      <p>Your Asiri Laboratories account has been created.</p>
    `;
    await this.sendEmail(to, 'Welcome to Asiri Laboratories', html);
  }

  async sendEscalationAlert(to: string, details: string): Promise<void> {
    const html = `
      <h2>Escalation Alert</h2>
      <p>${details}</p>
    `;
    await this.sendEmail(to, '⚠️ Escalation Alert — Asiri Laboratories', html);
  }
}