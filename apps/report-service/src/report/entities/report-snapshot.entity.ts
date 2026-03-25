import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * Running spending/income total per household / user / category / type / month.
 * Maintained by consuming transaction.* events.
 * Unique constraint on (householdId, userId, categoryId, type, month) is used
 * by the ON CONFLICT upsert in addToSnapshot.
 */
@Entity('report_snapshots')
@Unique(['householdId', 'userId', 'categoryId', 'type', 'month'])
export class ReportSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'household_id' })
  householdId!: string;

  @Index()
  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'category_id' })
  categoryId!: string;

  /** 'income' | 'expense' */
  @Column({ type: 'varchar' })
  type!: string;

  /** YYYY-MM */
  @Column({ type: 'varchar' })
  month!: string;

  /** Accumulated amount in smallest currency unit. */
  @Column({ name: 'total_amount', type: 'int', default: 0 })
  totalAmount!: number;

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt!: Date | null;
}
