import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { HouseholdMember } from './household-member.entity';
import { Invitation } from './invitation.entity';

@Entity('households')
export class Household {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  /** ISO 4217 currency code. Immutable after creation. */
  @Column({ length: 3 })
  currency!: string;

  @Column()
  createdBy!: string;

  @OneToMany(() => HouseholdMember, (m) => m.household)
  members!: HouseholdMember[];

  @OneToMany(() => Invitation, (i) => i.household)
  invitations!: Invitation[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
