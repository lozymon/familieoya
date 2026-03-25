import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import {
  BUDGET_THRESHOLD_EXCEEDED,
  BUDGET_THRESHOLD_WARNING,
  HOUSEHOLD_DELETED,
  HOUSEHOLD_INVITATION_SENT,
  HOUSEHOLD_MEMBER_JOINED,
  USER_REGISTERED,
  BudgetThresholdExceededEvent,
  BudgetThresholdWarningEvent,
  HouseholdDeletedEvent,
  HouseholdInvitationSentEvent,
  HouseholdMemberJoinedEvent,
  UserRegisteredEvent,
} from '@familieoya/contracts';
import { NotificationService } from './notification.service';
import { MailerService } from '../mailer/mailer.service';
import { AuthClient } from '../http-clients/auth.client';
import { HouseholdClient } from '../http-clients/household.client';

@Controller()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(
    private readonly notifications: NotificationService,
    private readonly mailer: MailerService,
    private readonly authClient: AuthClient,
    private readonly householdClient: HouseholdClient,
  ) {}

  @EventPattern(USER_REGISTERED)
  async onUserRegistered(
    @Payload() event: UserRegisteredEvent,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    this.logger.log(`[user.registered] user=${event.userId}`);
    await this.mailer.sendWelcome({ to: event.email, name: event.name });
    ctx.getChannelRef().ack(ctx.getMessage());
  }

  @EventPattern(HOUSEHOLD_INVITATION_SENT)
  async onInvitationSent(
    @Payload() event: HouseholdInvitationSentEvent,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    this.logger.log(
      `[invitation.sent] household=${event.householdId} email=${event.email}`,
    );
    await this.mailer.sendInvitation({
      to: event.email,
      inviterName: event.inviterName,
      householdId: event.householdId,
      token: event.token,
    });
    ctx.getChannelRef().ack(ctx.getMessage());
  }

  @EventPattern(HOUSEHOLD_MEMBER_JOINED)
  async onMemberJoined(
    @Payload() event: HouseholdMemberJoinedEvent,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    this.logger.log(
      `[member.joined] household=${event.householdId} user=${event.userId}`,
    );
    // Persist in-app notification for the joining user
    await this.notifications.persist(
      event.userId,
      event.householdId,
      'member_joined',
      'You have joined a new household.',
    );
    ctx.getChannelRef().ack(ctx.getMessage());
  }

  @EventPattern(BUDGET_THRESHOLD_WARNING)
  async onBudgetWarning(
    @Payload() event: BudgetThresholdWarningEvent,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    this.logger.log(
      `[budget.threshold.warning] household=${event.householdId} cat=${event.categoryId} pct=${event.percentage}%`,
    );
    await this.notifyHouseholdBudget(event, 'warning');
    ctx.getChannelRef().ack(ctx.getMessage());
  }

  @EventPattern(BUDGET_THRESHOLD_EXCEEDED)
  async onBudgetExceeded(
    @Payload() event: BudgetThresholdExceededEvent,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    this.logger.log(
      `[budget.threshold.exceeded] household=${event.householdId} cat=${event.categoryId} pct=${event.percentage}%`,
    );
    await this.notifyHouseholdBudget(event, 'exceeded');
    ctx.getChannelRef().ack(ctx.getMessage());
  }

  @EventPattern(HOUSEHOLD_DELETED)
  async onHouseholdDeleted(
    @Payload() event: HouseholdDeletedEvent,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    this.logger.log(`[household.deleted] household=${event.householdId}`);
    await this.notifications.deleteByHousehold(event.householdId);
    ctx.getChannelRef().ack(ctx.getMessage());
  }

  private async notifyHouseholdBudget(
    event: BudgetThresholdWarningEvent | BudgetThresholdExceededEvent,
    type: 'warning' | 'exceeded',
  ): Promise<void> {
    const memberIds = await this.householdClient.getHouseholdMembers(
      event.householdId,
    );

    const message =
      type === 'warning'
        ? `You've used ${event.percentage}% of your budget for category ${event.categoryId}.`
        : `You've exceeded your budget for category ${event.categoryId}.`;

    await Promise.all(
      memberIds.map(async (userId) => {
        const prefs = await this.authClient.getNotificationPreferences(userId);
        if (!prefs?.budgetAlerts) return;

        // Persist in-app notification
        await this.notifications.persist(
          userId,
          event.householdId,
          type === 'warning' ? 'budget_warning' : 'budget_exceeded',
          message,
        );

        // Send email alert
        await this.mailer.sendBudgetAlert({
          to: prefs.email,
          categoryId: event.categoryId,
          percentage: event.percentage,
          limitAmount: event.limitAmount,
          spentAmount: event.spentAmount,
          type,
        });
      }),
    );
  }
}
