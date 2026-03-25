import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MailerService } from '../mailer/mailer.service';
import { AuthClient } from '../http-clients/auth.client';
import { HouseholdClient } from '../http-clients/household.client';

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    private readonly mailer: MailerService,
    private readonly authClient: AuthClient,
    private readonly householdClient: HouseholdClient,
  ) {}

  @Cron('0 8 * * MON')
  async sendWeeklyDigest(): Promise<void> {
    this.logger.log('Sending weekly digest emails');
    const households = await this.householdClient.getActiveHouseholds();

    for (const household of households) {
      for (const userId of household.memberIds) {
        const prefs = await this.authClient.getNotificationPreferences(userId);
        if (!prefs?.weeklyDigest) continue;

        // Digest email — spending totals would come from report-service in a
        // full implementation (Phase 7b). For now we send a placeholder digest
        // to demonstrate the cron + opt-out flow.
        await this.mailer.sendDigest({
          to: prefs.email,
          householdName: household.id,
          month: new Date().toLocaleString('en', {
            month: 'long',
            year: 'numeric',
          }),
          totalIncome: 0,
          totalExpense: 0,
          currency: 'NOK',
        });
      }
    }

    this.logger.log('Weekly digest complete');
  }
}
