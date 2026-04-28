import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private senderEmail: string;
  private senderName: string;
  private apiKey: string | null = null;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('brevo.apiKey') ?? null;
    this.senderEmail = this.config.get<string>('brevo.senderEmail') ?? 'asirimobilelabs@gmail.com';
    this.senderName = this.config.get<string>('brevo.senderName') ?? 'Asiri Mobile Labs';

    if (!this.apiKey) {
      this.logger.warn('BREVO_API_KEY not set — email sending disabled');
    } else {
      this.logger.log('Brevo email service initialized');
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    toName?: string,
  ): Promise<void> {
    if (!this.apiKey) {
      this.logger.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`);
      return;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: this.senderName,
            email: this.senderEmail,
          },
          to: [{ email: to, name: toName ?? to }],
          subject,
          htmlContent,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Brevo API error ${response.status}: ${error}`);
        return;
      }

      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
      // Never throw — email failure should not crash the main flow
    }
  }

  async sendWelcome(to: string, fullName: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
        <div style="background:#0d9488;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">Asiri Mobile Labs</h1>
        </div>
        <div style="background:#f9f9f9;padding:30px;border-radius:0 0 8px 8px;">
          <h2 style="color:#0d9488;">Welcome, ${fullName}!</h2>
          <p>Your staff account on the Asiri Mobile Laboratory System has been created successfully.</p>
          <p>You can now log in to the admin portal using your email address and the temporary password provided by your administrator.</p>
          <p style="margin-top:30px;color:#888;font-size:12px;">
            This is an automated message from Asiri Mobile Labs. Please do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `;
    await this.sendEmail(to, 'Welcome to Asiri Laboratories', html, fullName);
  }

  async sendPasswordReset(to: string, resetLink: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
        <div style="background:#0d9488;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">Asiri Mobile Labs</h1>
        </div>
        <div style="background:#f9f9f9;padding:30px;border-radius:0 0 8px 8px;">
          <h2 style="color:#0d9488;">Password Reset Request</h2>
          <p>We received a request to reset your password. Click the button below to proceed:</p>
          <div style="text-align:center;margin:30px 0;">
            <a href="${resetLink}"
               style="background:#0d9488;color:white;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;">
              Reset Password
            </a>
          </div>
          <p style="color:#666;">This link will expire in <strong>1 hour</strong>.</p>
          <p style="color:#666;">If you did not request a password reset, please ignore this email.</p>
          <p style="margin-top:30px;color:#888;font-size:12px;">
            This is an automated message from Asiri Mobile Labs. Please do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `;
    await this.sendEmail(to, 'Reset Your Password — Asiri Laboratories', html);
  }

  async sendEscalationAlert(
    to: string,
    details: string,
    urgency: 'normal' | 'urgent' | 'critical' = 'normal',
  ): Promise<void> {
    const urgencyColor =
      urgency === 'critical' ? '#dc2626' :
      urgency === 'urgent' ? '#f59e0b' : '#0d9488';

    const urgencyLabel = urgency.toUpperCase();

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
        <div style="background:${urgencyColor};padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">⚠️ Escalation Alert — ${urgencyLabel}</h1>
        </div>
        <div style="background:#f9f9f9;padding:30px;border-radius:0 0 8px 8px;">
          <h2 style="color:${urgencyColor};">Action Required</h2>
          <div style="background:white;padding:20px;border-radius:6px;border-left:4px solid ${urgencyColor};">
            <p style="margin:0;">${details}</p>
          </div>
          <p style="margin-top:20px;color:#666;">
            Please log in to the Asiri Mobile Labs admin portal to review and action this escalation.
          </p>
          <p style="margin-top:30px;color:#888;font-size:12px;">
            This is an automated message from Asiri Mobile Labs. Please do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `;
    await this.sendEmail(
      to,
      `⚠️ [${urgencyLabel}] Escalation Alert — Asiri Laboratories`,
      html,
    );
  }

  async sendOtpEmail(to: string, otp: string, fullName?: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
        <div style="background:#0d9488;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">Asiri Mobile Labs</h1>
        </div>
        <div style="background:#f9f9f9;padding:30px;border-radius:0 0 8px 8px;text-align:center;">
          <h2 style="color:#0d9488;">Your Verification Code</h2>
          ${fullName ? `<p>Hi ${fullName},</p>` : ''}
          <p>Use the code below to verify your account:</p>
          <div style="background:white;border:2px dashed #0d9488;border-radius:8px;padding:20px;margin:20px auto;display:inline-block;">
            <span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#0d9488;">${otp}</span>
          </div>
          <p style="color:#666;">This code expires in <strong>10 minutes</strong>.</p>
          <p style="color:#666;font-size:13px;">If you did not request this code, please ignore this email.</p>
          <p style="margin-top:30px;color:#888;font-size:12px;">
            This is an automated message from Asiri Mobile Labs. Please do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `;
    await this.sendEmail(
      to,
      'Your Verification Code — Asiri Laboratories',
      html,
      fullName,
    );
  }
}