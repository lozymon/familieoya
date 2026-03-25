import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  householdId!: string;

  /** Seeded categories have a stable key (e.g. 'food', 'electricity').
   *  User-created categories have key = null — name is shown as-is. */
  @Column({ type: 'varchar', nullable: true, default: null })
  key!: string | null;

  /** English display name for seeded categories; user's typed value for custom. */
  @Column()
  name!: string;

  @OneToMany(() => Transaction, (t) => t.category)
  transactions!: Transaction[];

  @CreateDateColumn()
  createdAt!: Date;
}
