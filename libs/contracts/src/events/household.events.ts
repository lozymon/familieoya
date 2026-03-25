import { BaseEvent } from './base';

export const HOUSEHOLD_CREATED = 'household.created';
export const HOUSEHOLD_DELETED = 'household.deleted';
export const HOUSEHOLD_INVITATION_SENT = 'household.invitation.sent';
export const HOUSEHOLD_MEMBER_JOINED = 'household.member.joined';
export const HOUSEHOLD_MEMBER_REMOVED = 'household.member.removed';

export interface HouseholdCreatedEvent extends BaseEvent {
  householdId: string;
  createdBy: string;
}

export interface HouseholdDeletedEvent extends BaseEvent {
  householdId: string;
}

export interface HouseholdInvitationSentEvent extends BaseEvent {
  householdId: string;
  email: string;
  token: string;
  inviterName: string;
}

export interface HouseholdMemberJoinedEvent extends BaseEvent {
  householdId: string;
  userId: string;
}

export interface HouseholdMemberRemovedEvent extends BaseEvent {
  householdId: string;
  userId: string;
}
