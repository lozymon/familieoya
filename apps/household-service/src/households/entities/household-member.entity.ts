import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Household } from './household.entity';

export type MemberRole = 'admin' | 'member';

@Entity('household_members')
export class HouseholdMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  householdId!: string;

  @Column()
  userId!: string;

  @Column({ type: 'varchar', default: 'member' })
  role!: MemberRole;

  @ManyToOne(() => Household, (h) => h.members, { onDelete: 'CASCADE' })
  household!: Household;

  @CreateDateColumn()
  joinedAt!: Date;
}
