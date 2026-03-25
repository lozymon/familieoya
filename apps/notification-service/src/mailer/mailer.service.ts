import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface WelcomeEmailData {
  to: string;
  name: string;
}

export interface InvitationEmailData {
  to: string;
  inviterName: string;
  householdId: string;
  token: string;
}

export interface BudgetAlertEmailData {
  to: string;
  categoryId: string;
  percentage: number;
  limitAmount: number;
  spentAmount: number;
  type: 'warning' | 'exceeded';
}

export interface DigestEmailData {
  to: string;
  householdName: string;
  month: string;
  totalIncome: number;
  totalExpense: number;
  currency: string;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly appBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.from = config.get<string>('MAILER_FROM', 'noreply@familieoya.no');
    this.appBaseUrl = config.get<string>(
      'APP_BASE_URL',
      'https://app.familieoya.furevikstrand.cloud',
    );
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST', 'localhost'),
      port: config.get<number>('SMTP_PORT', 1025),
      secure: config.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: config.get<string>('SMTP_USER')
        ? {
            user: config.get<string>('SMTP_USER'),
            pass: config.get<string>('SMTP_PASS'),
          }
        : undefined,
    });
  }

  async sendWelcome(data: WelcomeEmailData): Promise<void> {
    await this.send({
      to: data.to,
      subject: 'Welcome to Familieøya!',
      html: `<p>Hi ${data.name},</p>
<p>Welcome to Familieøya — your family budget app. <a href="${this.appBaseUrl}">Get started</a>.</p>`,
    });
  }

  async sendInvitation(data: InvitationEmailData): Promise<void> {
    const link = `${this.appBaseUrl}/invitations/${data.token}/accept`;
    await this.send({
      to: data.to,
      subject: `${data.inviterName} invited you to join a household on Familieøya`,
      html: `<p>Hi,</p>
<p><strong>${data.inviterName}</strong> has invited you to join their household on Familieøya.</p>
<p><a href="${link}">Accept invitation</a></p>
<p>This link expires in 7 days.</p>`,
    });
  }

  async sendBudgetAlert(data: BudgetAlertEmailData): Promise<void> {
    const spent = (data.spentAmount / 100).toFixed(2);
    const limit = (data.limitAmount / 100).toFixed(2);
    const subject =
      data.type === 'warning'
        ? `Budget warning: you've used ${data.percentage}% of your budget`
        : `Budget exceeded: you've gone over your budget`;
    await this.send({
      to: data.to,
      subject,
      html: `<p>Your household has ${data.type === 'warning' ? `used <strong>${data.percentage}%</strong>` : '<strong>exceeded</strong>'} of its budget for category <strong>${data.categoryId}</strong>.</p>
<p>Spent: ${spent} / Limit: ${limit}</p>
<p><a href="${this.appBaseUrl}/budgets">View budget status</a></p>`,
    });
  }

  async sendDigest(data: DigestEmailData): Promise<void> {
    const income = (data.totalIncome / 100).toFixed(2);
    const expense = (data.totalExpense / 100).toFixed(2);
    await this.send({
      to: data.to,
      subject: `Familieøya weekly digest — ${data.householdName}`,
      html: `<p>Here is your spending summary for <strong>${data.month}</strong>:</p>
<ul>
  <li>Income: ${income} ${data.currency}</li>
  <li>Expenses: ${expense} ${data.currency}</li>
</ul>
<p><a href="${this.appBaseUrl}">View details</a></p>`,
    });
  }

  private async send(msg: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, ...msg });
      this.logger.log(`Email sent to ${msg.to}: ${msg.subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${msg.to}`, err);
      // Don't throw — email failure should not nack the RabbitMQ message
    }
  }
}
