import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogs: Repository<ActivityLog>,
  ) {}

  async log(data: {
    householdId: string;
    userId?: string | null;
    actorName: string;
    action: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const record = this.activityLogs.create({
      householdId: data.householdId,
      userId: data.userId ?? null,
      actorName: data.actorName,
      action: data.action,
      metadata: data.metadata ?? {},
    });
    await this.activityLogs.save(record);
  }

  async listForHousehold(householdId: string): Promise<ActivityLog[]> {
    return this.activityLogs.find({
      where: { householdId },
      order: { createdAt: 'DESC' },
    });
  }

  async listForUser(userId: string): Promise<ActivityLog[]> {
    return this.activityLogs.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async handleUserDeleted(userId: string): Promise<void> {
    await this.activityLogs
      .createQueryBuilder()
      .update()
      .set({ userId: null, actorName: 'Deleted user' })
      .where('user_id = :userId', { userId })
      .execute();
  }

  async deleteHouseholdData(householdId: string): Promise<void> {
    await this.activityLogs
      .createQueryBuilder()
      .delete()
      .where('household_id = :householdId', { householdId })
      .execute();
  }
}
