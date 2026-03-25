import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from './category.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  householdId!: string;

  @Column()
  userId!: string;

  @Column({ type: 'varchar' })
  type!: 'income' | 'expense';

  /** Amount in smallest currency unit (øre / cents). Never store floats. */
  @Column({ type: 'int' })
  amount!: number;

  @Column()
  categoryId!: string;

  @ManyToOne(() => Category, (c) => c.transactions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoryId' })
  category!: Category;

  @Column({ type: 'varchar', nullable: true, default: null })
  description!: string | null;

  /** ISO 8601 date string (YYYY-MM-DD). */
  @Column({ type: 'varchar' })
  date!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
