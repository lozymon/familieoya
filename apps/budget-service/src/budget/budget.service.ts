import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { lastValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  BUDGET_THRESHOLD_EXCEEDED,
  BUDGET_THRESHOLD_WARNING,
} from '@familieoya/contracts';
import { Budget } from './entities/budget.entity';
import { BudgetSnapshot } from './entities/budget-snapshot.entity';
import { BudgetAlertState } from './entities/budget-alert-state.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgets: Repository<Budget>,
    @InjectRepository(BudgetSnapshot)
    private readonly snapshots: Repository<BudgetSnapshot>,
    @InjectRepository(BudgetAlertState)
    private readonly alertStates: Repository<BudgetAlertState>,
    @Inject('RABBITMQ_CLIENT')
    private readonly rmq: ClientProxy,
    private readonly dataSource: DataSource,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async list(householdId: string): Promise<Budget[]> {
    return this.budgets.findBy({ householdId });
  }

  async create(householdId: string, dto: CreateBudgetDto): Promise<Budget> {
    const existing = await this.budgets.findOneBy({
      householdId,
      categoryId: dto.categoryId,
    });
    if (existing) {
      throw new ConflictException(
        'Budget limit already exists for this category',
      );
    }
    const budget = this.budgets.create({ householdId, ...dto });
    return this.budgets.save(budget);
  }

  async update(
    householdId: string,
    id: string,
    dto: UpdateBudgetDto,
  ): Promise<Budget> {
    const budget = await this.findOwnedOrFail(householdId, id);
    budget.limitAmount = dto.limitAmount;
    const saved = await this.budgets.save(budget);

    // Reset alert state so the new limit's thresholds can fire again
    const month = this.currentMonth();
    await this.alertStates.update(
      { budgetId: id, month },
      { warningSentAt: null, exceededSentAt: null },
    );

    return saved;
  }

  async remove(householdId: string, id: string): Promise<void> {
    const budget = await this.findOwnedOrFail(householdId, id);
    await this.budgets.remove(budget);
  }

  // ── Status ────────────────────────────────────────────────────────────────

  async status(householdId: string) {
    const month = this.currentMonth();
    const budgetList = await this.budgets.findBy({ householdId });

    return Promise.all(
      budgetList.map(async (b) => {
        const snap = await this.snapshots.findOneBy({
          householdId,
          categoryId: b.categoryId,
          month,
        });
        const spentAmount = snap?.spentAmount ?? 0;
        const percentage =
          b.limitAmount > 0
            ? Math.round((spentAmount / b.limitAmount) * 100)
            : 0;
        const status =
          percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'ok';
        return {
          budgetId: b.id,
          categoryId: b.categoryId,
          limitAmount: b.limitAmount,
          spentAmount,
          percentage,
          status,
        };
      }),
    );
  }

  // ── Event-driven spending totals ──────────────────────────────────────────

  async addToTotal(
    qr: QueryRunner,
    householdId: string,
    categoryId: string,
    month: string,
    amount: number,
  ): Promise<void> {
    await qr.manager.query(
      `INSERT INTO budget_snapshots
         (id, household_id, category_id, month, spent_amount, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
       ON CONFLICT (household_id, category_id, month)
       DO UPDATE SET spent_amount = budget_snapshots.spent_amount + $4,
                     updated_at = NOW()`,
      [householdId, categoryId, month, amount],
    );
  }

  async subtractFromTotal(
    qr: QueryRunner,
    householdId: string,
    categoryId: string,
    month: string,
    amount: number,
  ): Promise<void> {
    await qr.manager.query(
      `UPDATE budget_snapshots
       SET spent_amount = GREATEST(0, spent_amount - $4),
           updated_at = NOW()
       WHERE household_id = $1
         AND category_id = $2
         AND month = $3`,
      [householdId, categoryId, month, amount],
    );
  }

  async checkThreshold(
    householdId: string,
    categoryId: string,
    month: string,
  ): Promise<void> {
    const budget = await this.budgets.findOneBy({ householdId, categoryId });
    if (!budget) return;

    const snap = await this.snapshots.findOneBy({
      householdId,
      categoryId,
      month,
    });
    const spentAmount = snap?.spentAmount ?? 0;
    const percentage = (spentAmount / budget.limitAmount) * 100;

    const state = await this.getOrCreateAlertState(budget.id, month);

    if (percentage >= 100 && !state.exceededSentAt) {
      await this.alertStates.update(state.id, { exceededSentAt: new Date() });
      await lastValueFrom(
        this.rmq.emit(BUDGET_THRESHOLD_EXCEEDED, {
          eventId: crypto.randomUUID(),
          householdId,
          categoryId,
          percentage: Math.round(percentage),
          limitAmount: budget.limitAmount,
          spentAmount,
        }),
      );
    } else if (percentage >= 80 && !state.warningSentAt) {
      await this.alertStates.update(state.id, { warningSentAt: new Date() });
      await lastValueFrom(
        this.rmq.emit(BUDGET_THRESHOLD_WARNING, {
          eventId: crypto.randomUUID(),
          householdId,
          categoryId,
          percentage: Math.round(percentage),
          limitAmount: budget.limitAmount,
          spentAmount,
        }),
      );
    }
  }

  // ── Household deleted cleanup ─────────────────────────────────────────────

  async deleteHouseholdData(householdId: string): Promise<void> {
    const budgetList = await this.budgets.findBy({ householdId });

    if (budgetList.length > 0) {
      const budgetIds = budgetList.map((b) => b.id);
      await this.alertStates
        .createQueryBuilder()
        .delete()
        .where('budget_id IN (:...ids)', { ids: budgetIds })
        .execute();
    }

    await this.snapshots
      .createQueryBuilder()
      .delete()
      .where('household_id = :householdId', { householdId })
      .execute();

    await this.budgets
      .createQueryBuilder()
      .delete()
      .where('household_id = :householdId', { householdId })
      .execute();
  }

  // ── Idempotency cleanup cron ──────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanProcessedEventIds(): Promise<void> {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await this.dataSource.query(
      `DELETE FROM processed_event_ids WHERE processed_at < $1`,
      [cutoff],
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async findOwnedOrFail(
    householdId: string,
    id: string,
  ): Promise<Budget> {
    const budget = await this.budgets.findOneBy({ id, householdId });
    if (!budget) throw new NotFoundException('Budget not found');
    return budget;
  }

  private async getOrCreateAlertState(
    budgetId: string,
    month: string,
  ): Promise<BudgetAlertState> {
    const existing = await this.alertStates.findOneBy({ budgetId, month });
    if (existing) return existing;
    const state = this.alertStates.create({ budgetId, month });
    return this.alertStates.save(state);
  }

  private currentMonth(): string {
    return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  }

  getDataSource(): DataSource {
    return this.dataSource;
  }
}
