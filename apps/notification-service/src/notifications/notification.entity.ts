import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column()
  householdId!: string;

  /** e.g. 'budget_warning' | 'budget_exceeded' | 'member_joined' */
  @Column()
  type!: string;

  @Column()
  message!: string;

  @Column({ type: 'timestamptz', nullable: true, default: null })
  readAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
