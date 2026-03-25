import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import {
  HOUSEHOLD_INVITATION_SENT,
  HOUSEHOLD_MEMBER_JOINED,
  HouseholdInvitationSentEvent,
  HouseholdMemberJoinedEvent,
} from '@familieoya/contracts';

@Controller()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);

  @EventPattern(HOUSEHOLD_INVITATION_SENT)
  onInvitationSent(
    @Payload() event: HouseholdInvitationSentEvent,
    @Ctx() ctx: RmqContext,
  ): void {
    this.logger.log(
      `[invitation.sent] household=${event.householdId} email=${event.email} inviter=${event.inviterName}`,
    );
    // Phase 5: send real invitation email via Resend/Nodemailer
    ctx.getChannelRef().ack(ctx.getMessage());
  }

  @EventPattern(HOUSEHOLD_MEMBER_JOINED)
  onMemberJoined(
    @Payload() event: HouseholdMemberJoinedEvent,
    @Ctx() ctx: RmqContext,
  ): void {
    this.logger.log(
      `[member.joined] household=${event.householdId} user=${event.userId}`,
    );
    // Phase 5: notify household admins
    ctx.getChannelRef().ack(ctx.getMessage());
  }
}
