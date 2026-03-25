import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Household } from './household.entity';

@Entity('invitations')
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  householdId!: string;

  /** The email this invitation was sent to. Validated on acceptance. */
  @Column()
  email!: string;

  /** 32-byte cryptographically random hex token. */
  @Column({ unique: true })
  token!: string;

  @Column()
  expiresAt!: Date;

  /** Set on acceptance — null means unused. */
  @Column({ type: 'timestamp', nullable: true })
  usedAt!: Date | null;

  /** userId of the admin who sent the invitation. */
  @Column()
  createdBy!: string;

  @ManyToOne(() => Household, (h) => h.invitations, { onDelete: 'CASCADE' })
  household!: Household;

  @CreateDateColumn()
  createdAt!: Date;
}
