import {
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import * as crypto from 'crypto';
import { Household } from './entities/household.entity';
import {
  HouseholdMember,
  MemberRole,
} from './entities/household-member.entity';
import { Invitation } from './entities/invitation.entity';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { SendInvitationDto } from './dto/send-invitation.dto';
import {
  HOUSEHOLD_CREATED,
  HOUSEHOLD_DELETED,
  HOUSEHOLD_INVITATION_SENT,
  HOUSEHOLD_MEMBER_JOINED,
  HOUSEHOLD_MEMBER_REMOVED,
  HouseholdCreatedEvent,
  HouseholdDeletedEvent,
  HouseholdInvitationSentEvent,
  HouseholdMemberJoinedEvent,
  HouseholdMemberRemovedEvent,
} from '@familieoya/contracts';

const INVITATION_TTL_DAYS = 7;

@Injectable()
export class HouseholdService {
  constructor(
    @InjectRepository(Household)
    private readonly households: Repository<Household>,
    @InjectRepository(HouseholdMember)
    private readonly members: Repository<HouseholdMember>,
    @InjectRepository(Invitation)
    private readonly invitations: Repository<Invitation>,
    @Inject('RABBITMQ_CLIENT')
    private readonly rmq: ClientProxy,
  ) {}

  async createHousehold(
    userId: string,
    dto: CreateHouseholdDto,
  ): Promise<Household> {
    const household = this.households.create({
      name: dto.name,
      currency: dto.currency,
      createdBy: userId,
    });
    await this.households.save(household);

    const member = this.members.create({
      householdId: household.id,
      userId,
      role: 'admin',
    });
    await this.members.save(member);

    const event: HouseholdCreatedEvent = {
      eventId: crypto.randomUUID(),
      householdId: household.id,
      createdBy: userId,
    };
    this.rmq.emit<void, HouseholdCreatedEvent>(HOUSEHOLD_CREATED, event);

    return household;
  }

  async getHousehold(id: string): Promise<Household> {
    const household = await this.households.findOne({
      where: { id },
      relations: ['members'],
    });
    if (!household) throw new NotFoundException('Household not found');
    return household;
  }

  async updateHousehold(
    id: string,
    userId: string,
    dto: UpdateHouseholdDto,
  ): Promise<Household> {
    await this.requireAdmin(id, userId);
    const household = await this.getHousehold(id);
    if (dto.name !== undefined) household.name = dto.name;
    return this.households.save(household);
  }

  async deleteHousehold(id: string, userId: string): Promise<void> {
    await this.requireAdmin(id, userId);
    await this.households.delete(id);

    const event: HouseholdDeletedEvent = {
      eventId: crypto.randomUUID(),
      householdId: id,
    };
    this.rmq.emit<void, HouseholdDeletedEvent>(HOUSEHOLD_DELETED, event);
  }

  async getMembers(householdId: string): Promise<HouseholdMember[]> {
    return this.members.find({ where: { householdId } });
  }

  async sendInvitation(
    householdId: string,
    adminId: string,
    dto: SendInvitationDto,
    inviterName: string,
  ): Promise<Invitation> {
    await this.requireAdmin(householdId, adminId);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);

    const token = crypto.randomBytes(32).toString('hex');
    const invitation = this.invitations.create({
      householdId,
      email: dto.email,
      token,
      expiresAt,
      usedAt: null,
      createdBy: adminId,
    });
    await this.invitations.save(invitation);

    const event: HouseholdInvitationSentEvent = {
      eventId: crypto.randomUUID(),
      householdId,
      email: dto.email,
      token,
      inviterName,
    };
    this.rmq.emit<void, HouseholdInvitationSentEvent>(
      HOUSEHOLD_INVITATION_SENT,
      event,
    );

    return invitation;
  }

  async getInvitation(
    token: string,
  ): Promise<{ email: string; householdName: string; expiresAt: Date }> {
    const invitation = await this.findValidInvitation(token);
    const household = await this.getHousehold(invitation.householdId);
    return {
      email: invitation.email,
      householdName: household.name,
      expiresAt: invitation.expiresAt,
    };
  }

  async acceptInvitation(
    token: string,
    userId: string,
    userEmail: string,
  ): Promise<{ householdId: string; householdName: string }> {
    const invitation = await this.findValidInvitation(token);

    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new ForbiddenException(
        'This invitation was sent to a different email. Log out and use that account.',
      );
    }

    // Mark as used
    invitation.usedAt = new Date();
    await this.invitations.save(invitation);

    // Join household
    const existing = await this.members.findOne({
      where: { householdId: invitation.householdId, userId },
    });
    if (!existing) {
      const member = this.members.create({
        householdId: invitation.householdId,
        userId,
        role: 'member',
      });
      await this.members.save(member);
    }

    const event: HouseholdMemberJoinedEvent = {
      eventId: crypto.randomUUID(),
      householdId: invitation.householdId,
      userId,
    };
    this.rmq.emit<void, HouseholdMemberJoinedEvent>(
      HOUSEHOLD_MEMBER_JOINED,
      event,
    );

    const household = await this.getHousehold(invitation.householdId);
    return { householdId: household.id, householdName: household.name };
  }

  async removeMember(
    householdId: string,
    adminId: string,
    targetUserId: string,
  ): Promise<void> {
    await this.requireAdmin(householdId, adminId);
    await this.members.delete({ householdId, userId: targetUserId });

    const event: HouseholdMemberRemovedEvent = {
      eventId: crypto.randomUUID(),
      householdId,
      userId: targetUserId,
    };
    this.rmq.emit<void, HouseholdMemberRemovedEvent>(
      HOUSEHOLD_MEMBER_REMOVED,
      event,
    );
  }

  async updateMemberRole(
    householdId: string,
    adminId: string,
    targetUserId: string,
    role: MemberRole,
  ): Promise<HouseholdMember> {
    await this.requireAdmin(householdId, adminId);
    const member = await this.members.findOne({
      where: { householdId, userId: targetUserId },
    });
    if (!member) throw new NotFoundException('Member not found');
    member.role = role;
    return this.members.save(member);
  }

  /** Used by HouseholdGuard (api-gateway) via the internal endpoint. */
  async isMember(householdId: string, userId: string): Promise<boolean> {
    const member = await this.members.findOne({
      where: { householdId, userId },
    });
    return !!member;
  }

  /** Used by notification-service to send per-member emails. */
  async getHouseholdMemberIds(householdId: string): Promise<string[]> {
    const rows = await this.members.find({ where: { householdId } });
    return rows.map((m) => m.userId);
  }

  async getActiveHouseholds(): Promise<{ id: string; memberIds: string[] }[]> {
    const allMembers = await this.members.find();
    const map = new Map<string, string[]>();
    for (const m of allMembers) {
      const existing = map.get(m.householdId) ?? [];
      existing.push(m.userId);
      map.set(m.householdId, existing);
    }
    return Array.from(map.entries()).map(([id, memberIds]) => ({
      id,
      memberIds,
    }));
  }

  async exportUserData(userId: string) {
    const memberships = await this.members.find({ where: { userId } });
    const invitationsSent = await this.invitations.find({
      where: { createdBy: userId },
    });
    return { memberships, invitationsSent };
  }

  private async requireAdmin(
    householdId: string,
    userId: string,
  ): Promise<void> {
    const member = await this.members.findOne({
      where: { householdId, userId, role: 'admin' },
    });
    if (!member)
      throw new ForbiddenException(
        'Only household admins can perform this action',
      );
  }

  private async findValidInvitation(token: string): Promise<Invitation> {
    const invitation = await this.invitations.findOne({ where: { token } });
    if (!invitation) throw new NotFoundException('Invitation not found');

    if (invitation.usedAt) {
      throw new GoneException('This invitation has already been accepted.');
    }

    if (invitation.expiresAt < new Date()) {
      throw new GoneException(
        'This invitation has expired. Ask an admin to send a new one.',
      );
    }

    return invitation;
  }
}
