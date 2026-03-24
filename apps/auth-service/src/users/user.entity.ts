import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  name!: string;

  @Column()
  passwordHash!: string;

  @Column({ default: 'en' })
  preferredLanguage!: 'en' | 'no' | 'pt';

  @Column({ default: true })
  budgetAlerts!: boolean;

  @Column({ default: true })
  householdUpdates!: boolean;

  @Column({ default: true })
  weeklyDigest!: boolean;

  @Column({ default: false })
  twoFactorEnabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
