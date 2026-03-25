import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('export_history')
export class ExportHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'household_id' })
  householdId!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  /** 'monthly' | 'yearly' | 'member' */
  @Column({ name: 'report_type', type: 'varchar' })
  reportType!: string;

  /** 'csv' */
  @Column({ type: 'varchar' })
  format!: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;
}
