import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * Running spending total per household / category / month.
 * Maintained by consuming transaction.* events.
 * Unique constraint on (household_id, category_id, month) is used by the
 * ON CONFLICT upsert in addToTotal/subtractFromTotal.
 */
@Entity('budget_snapshots')
@Unique(['householdId', 'categoryId', 'month'])
export class BudgetSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'household_id' })
  householdId!: string;

  @Column({ name: 'category_id' })
  categoryId!: string;

  /** YYYY-MM */
  @Column({ type: 'varchar' })
  month!: string;

  /** Accumulated expense amount in smallest currency unit. */
  @Column({ name: 'spent_amount', type: 'int', default: 0 })
  spentAmount!: number;

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt!: Date | null;
}
