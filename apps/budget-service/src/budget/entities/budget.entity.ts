import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/** Spending limit per category per household. */
@Entity('budgets')
@Unique(['householdId', 'categoryId'])
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'household_id' })
  householdId!: string;

  @Column({ name: 'category_id' })
  categoryId!: string;

  /** Limit in smallest currency unit (øre / cents). */
  @Column({ name: 'limit_amount', type: 'int' })
  limitAmount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
