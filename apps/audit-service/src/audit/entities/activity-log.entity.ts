import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('activity_logs')
@Index(['householdId'])
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'household_id', type: 'varchar' })
  householdId!: string;

  @Column({ name: 'user_id', type: 'varchar', nullable: true })
  userId!: string | null;

  @Column({ name: 'actor_name', type: 'varchar' })
  actorName!: string;

  @Column({ type: 'varchar' })
  action!: string;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;
}
