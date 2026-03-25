import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import * as crypto from 'crypto';
import { Transaction } from './entities/transaction.entity';
import { CategoryService } from './category.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import {
  TRANSACTION_CREATED,
  TRANSACTION_DELETED,
  TRANSACTION_UPDATED,
  TransactionCreatedEvent,
  TransactionDeletedEvent,
  TransactionUpdatedEvent,
} from '@familieoya/contracts';

export interface SummaryItem {
  categoryId: string;
  categoryKey: string | null;
  categoryName: string;
  type: 'income' | 'expense';
  total: number;
}

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
    private readonly categoryService: CategoryService,
    @Inject('RABBITMQ_CLIENT')
    private readonly rmq: ClientProxy,
  ) {}

  async listTransactions(
    householdId: string,
    filters: { month?: string; categoryId?: string; type?: string },
  ): Promise<Transaction[]> {
    const qb = this.transactions
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'category')
      .where('t.householdId = :householdId', { householdId })
      .orderBy('t.date', 'DESC')
      .addOrderBy('t.createdAt', 'DESC');

    if (filters.month) {
      // month format: YYYY-MM
      qb.andWhere("to_char(t.date::date, 'YYYY-MM') = :month", {
        month: filters.month,
      });
    }
    if (filters.categoryId) {
      qb.andWhere('t.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    }
    if (filters.type) {
      qb.andWhere('t.type = :type', { type: filters.type });
    }

    return qb.getMany();
  }

  async getTransaction(householdId: string, id: string): Promise<Transaction> {
    const t = await this.transactions.findOne({
      where: { id, householdId },
      relations: ['category'],
    });
    if (!t) throw new NotFoundException('Transaction not found');
    return t;
  }

  async createTransaction(
    householdId: string,
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    // Verify category belongs to this household
    await this.categoryService.findOneOrFail(householdId, dto.categoryId);

    const t = this.transactions.create({
      householdId,
      userId,
      type: dto.type,
      amount: dto.amount,
      categoryId: dto.categoryId,
      description: dto.description ?? null,
      date: dto.date,
    });
    const saved = await this.transactions.save(t);

    const event: TransactionCreatedEvent = {
      eventId: crypto.randomUUID(),
      transactionId: saved.id,
      householdId,
      categoryId: saved.categoryId,
      amount: saved.amount,
      type: saved.type,
      date: saved.date,
    };
    this.rmq.emit<void, TransactionCreatedEvent>(TRANSACTION_CREATED, event);

    return saved;
  }

  async updateTransaction(
    householdId: string,
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    const t = await this.getTransaction(householdId, id);

    const previousCategoryId = t.categoryId;
    const previousAmount = t.amount;
    const previousType = t.type;
    const previousDate = t.date;

    if (dto.categoryId && dto.categoryId !== t.categoryId) {
      await this.categoryService.findOneOrFail(householdId, dto.categoryId);
      t.categoryId = dto.categoryId;
    }
    if (dto.type !== undefined) t.type = dto.type;
    if (dto.amount !== undefined) t.amount = dto.amount;
    if (dto.description !== undefined) t.description = dto.description;
    if (dto.date !== undefined) t.date = dto.date;

    const saved = await this.transactions.save(t);

    const event: TransactionUpdatedEvent = {
      eventId: crypto.randomUUID(),
      transactionId: saved.id,
      householdId,
      categoryId: saved.categoryId,
      amount: saved.amount,
      type: saved.type,
      date: saved.date,
      previousCategoryId,
      previousAmount,
      previousType,
      previousDate,
    };
    this.rmq.emit<void, TransactionUpdatedEvent>(TRANSACTION_UPDATED, event);

    return saved;
  }

  async deleteTransaction(householdId: string, id: string): Promise<void> {
    const t = await this.getTransaction(householdId, id);
    await this.transactions.remove(t);

    const event: TransactionDeletedEvent = {
      eventId: crypto.randomUUID(),
      transactionId: id,
      householdId,
      categoryId: t.categoryId,
      previousAmount: t.amount,
      type: t.type,
      date: t.date,
    };
    this.rmq.emit<void, TransactionDeletedEvent>(TRANSACTION_DELETED, event);
  }

  async bulkDelete(householdId: string, ids: string[]): Promise<void> {
    const ts = await this.transactions.find({
      where: ids.map((id) => ({ id, householdId })),
    });

    if (ts.length === 0) return;

    await this.transactions.remove(ts);

    for (const t of ts) {
      const event: TransactionDeletedEvent = {
        eventId: crypto.randomUUID(),
        transactionId: t.id,
        householdId,
        categoryId: t.categoryId,
        previousAmount: t.amount,
        type: t.type,
        date: t.date,
      };
      this.rmq.emit<void, TransactionDeletedEvent>(TRANSACTION_DELETED, event);
    }
  }

  async getSummary(householdId: string, month: string): Promise<SummaryItem[]> {
    // month format: YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('month must be in YYYY-MM format');
    }

    const rows = await this.transactions
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'category')
      .where('t.householdId = :householdId', { householdId })
      .andWhere("to_char(t.date::date, 'YYYY-MM') = :month", { month })
      .select([
        't.categoryId',
        'category.key',
        'category.name',
        't.type',
        'SUM(t.amount) as total',
      ])
      .groupBy('t.categoryId')
      .addGroupBy('category.key')
      .addGroupBy('category.name')
      .addGroupBy('t.type')
      .getRawMany();

    return rows.map((r) => ({
      categoryId: r.t_categoryId,
      categoryKey: r.category_key,
      categoryName: r.category_name,
      type: r.t_type,
      total: Number(r.total),
    }));
  }

  async deleteAllForHousehold(householdId: string): Promise<void> {
    await this.transactions.delete({ householdId });
  }
}
