import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * Deduplication table for budget threshold alerts.
 * Keyed by (budget_id, month) — one row per budget per calendar month.
 * New month = new row = alerts reset naturally (no cron needed).
 */
@Entity('budget_alert_state')
@Unique(['budgetId', 'month'])
export class BudgetAlertState {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'budget_id' })
  budgetId!: string;

  /** YYYY-MM */
  @Column({ type: 'varchar' })
  month!: string;

  @Column({
    name: 'warning_sent_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  warningSentAt!: Date | null;

  @Column({
    name: 'exceeded_sent_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  exceededSentAt!: Date | null;
}
