import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { lastValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { REPORT_EXPORTED } from '@familieoya/contracts';
import { ReportSnapshot } from './entities/report-snapshot.entity';
import { ExportHistory } from './entities/export-history.entity';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(ReportSnapshot)
    private readonly snapshots: Repository<ReportSnapshot>,
    @InjectRepository(ExportHistory)
    private readonly exportHistory: Repository<ExportHistory>,
    @Inject('RABBITMQ_CLIENT')
    private readonly rmq: ClientProxy,
    private readonly dataSource: DataSource,
  ) {}

  // ── Snapshot upsert ────────────────────────────────────────────────────────

  async addToSnapshot(
    qr: QueryRunner,
    householdId: string,
    userId: string,
    categoryId: string,
    type: string,
    month: string,
    amount: number,
  ): Promise<void> {
    await qr.manager.query(
      `INSERT INTO report_snapshots
         (id, household_id, user_id, category_id, type, month, total_amount, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (household_id, user_id, category_id, type, month)
       DO UPDATE SET total_amount = report_snapshots.total_amount + $6,
                     updated_at = NOW()`,
      [householdId, userId, categoryId, type, month, amount],
    );
  }

  async subtractFromSnapshot(
    qr: QueryRunner,
    householdId: string,
    userId: string,
    categoryId: string,
    type: string,
    month: string,
    amount: number,
  ): Promise<void> {
    await qr.manager.query(
      `UPDATE report_snapshots
       SET total_amount = GREATEST(0, total_amount - $6),
           updated_at = NOW()
       WHERE household_id = $1
         AND user_id = $2
         AND category_id = $3
         AND type = $4
         AND month = $5`,
      [householdId, userId, categoryId, type, month, amount],
    );
  }

  // ── Report queries ─────────────────────────────────────────────────────────

  async getMonthly(householdId: string, month: string) {
    const rows: Array<{
      type: string;
      category_id: string;
      total: string;
    }> = await this.dataSource.query(
      `SELECT type, category_id, SUM(total_amount)::int AS total
       FROM report_snapshots
       WHERE household_id = $1 AND month = $2
       GROUP BY type, category_id`,
      [householdId, month],
    );

    const prevMonth = this.previousMonth(month);
    const prevRows: Array<{
      type: string;
      category_id: string;
      total: string;
    }> = await this.dataSource.query(
      `SELECT type, category_id, SUM(total_amount)::int AS total
       FROM report_snapshots
       WHERE household_id = $1 AND month = $2
       GROUP BY type, category_id`,
      [householdId, prevMonth],
    );

    const totalIncome = rows
      .filter((r) => r.type === 'income')
      .reduce((s, r) => s + Number(r.total), 0);
    const totalExpense = rows
      .filter((r) => r.type === 'expense')
      .reduce((s, r) => s + Number(r.total), 0);

    const categoryBreakdown = this.buildCategoryBreakdown(rows);
    const previousMonth = {
      totalIncome: prevRows
        .filter((r) => r.type === 'income')
        .reduce((s, r) => s + Number(r.total), 0),
      totalExpense: prevRows
        .filter((r) => r.type === 'expense')
        .reduce((s, r) => s + Number(r.total), 0),
    };

    return {
      month,
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
      categoryBreakdown,
      previousMonth,
    };
  }

  async getYearly(householdId: string, year: string) {
    const rows: Array<{
      month: string;
      type: string;
      total: string;
    }> = await this.dataSource.query(
      `SELECT month, type, SUM(total_amount)::int AS total
       FROM report_snapshots
       WHERE household_id = $1 AND month LIKE $2
       GROUP BY month, type
       ORDER BY month`,
      [householdId, `${year}-%`],
    );

    const totalIncome = rows
      .filter((r) => r.type === 'income')
      .reduce((s, r) => s + Number(r.total), 0);
    const totalExpense = rows
      .filter((r) => r.type === 'expense')
      .reduce((s, r) => s + Number(r.total), 0);

    // Build monthly breakdown
    const monthMap = new Map<string, { income: number; expense: number }>();
    for (const r of rows) {
      const entry = monthMap.get(r.month) ?? { income: 0, expense: 0 };
      if (r.type === 'income') entry.income += Number(r.total);
      else entry.expense += Number(r.total);
      monthMap.set(r.month, entry);
    }
    const monthlyBreakdown = Array.from(monthMap.entries()).map(
      ([month, { income, expense }]) => ({
        month,
        totalIncome: income,
        totalExpense: expense,
        net: income - expense,
      }),
    );

    return { year, totalIncome, totalExpense, monthlyBreakdown };
  }

  async getMember(householdId: string, month: string) {
    const rows: Array<{
      user_id: string;
      type: string;
      category_id: string;
      total: string;
    }> = await this.dataSource.query(
      `SELECT user_id, type, category_id, SUM(total_amount)::int AS total
       FROM report_snapshots
       WHERE household_id = $1 AND month = $2
       GROUP BY user_id, type, category_id`,
      [householdId, month],
    );

    const userMap = new Map<
      string,
      { income: number; expense: number; catRows: typeof rows }
    >();
    for (const r of rows) {
      const entry = userMap.get(r.user_id) ?? {
        income: 0,
        expense: 0,
        catRows: [],
      };
      if (r.type === 'income') entry.income += Number(r.total);
      else entry.expense += Number(r.total);
      entry.catRows.push(r);
      userMap.set(r.user_id, entry);
    }

    const members = Array.from(userMap.entries()).map(
      ([userId, { income, expense, catRows }]) => ({
        userId,
        totalIncome: income,
        totalExpense: expense,
        categoryBreakdown: this.buildCategoryBreakdown(catRows),
      }),
    );

    return { month, members };
  }

  // ── CSV export ─────────────────────────────────────────────────────────────

  async exportCsv(
    householdId: string,
    userId: string,
    reportType: 'monthly' | 'yearly' | 'member',
    month?: string,
    year?: string,
  ): Promise<string> {
    const rows: Array<{
      month: string;
      user_id: string;
      category_id: string;
      type: string;
      total_amount: number;
    }> = await this.dataSource.query(
      `SELECT month, user_id, category_id, type, SUM(total_amount)::int AS total_amount
       FROM report_snapshots
       WHERE household_id = $1
       GROUP BY month, user_id, category_id, type
       ORDER BY month, user_id, category_id, type`,
      [householdId],
    );

    const header = 'month,userId,categoryId,type,totalAmount\n';
    const dataRows = rows
      .map(
        (r) =>
          `${r.month},${r.user_id},${r.category_id},${r.type},${r.total_amount}`,
      )
      .join('\n');
    const csv = header + dataRows;

    // Save export history
    const record = this.exportHistory.create({
      householdId,
      userId,
      reportType,
      format: 'csv',
    });
    await this.exportHistory.save(record);

    // Emit REPORT_EXPORTED event
    await lastValueFrom(
      this.rmq.emit(REPORT_EXPORTED, {
        eventId: crypto.randomUUID(),
        householdId,
        userId,
        reportType,
        format: 'csv',
      }),
    );

    return csv;
  }

  // ── Export history ─────────────────────────────────────────────────────────

  async listExportHistory(householdId: string): Promise<ExportHistory[]> {
    return this.exportHistory.findBy({ householdId });
  }

  async listForUser(userId: string): Promise<ExportHistory[]> {
    return this.exportHistory.findBy({ userId });
  }

  // ── Household deleted cleanup ──────────────────────────────────────────────

  async deleteHouseholdData(householdId: string): Promise<void> {
    await this.snapshots
      .createQueryBuilder()
      .delete()
      .where('household_id = :householdId', { householdId })
      .execute();

    await this.exportHistory
      .createQueryBuilder()
      .delete()
      .where('household_id = :householdId', { householdId })
      .execute();
  }

  // ── Idempotency cleanup cron ───────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanProcessedEventIds(): Promise<void> {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await this.dataSource.query(
      `DELETE FROM processed_event_ids WHERE processed_at < $1`,
      [cutoff],
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  getDataSource(): DataSource {
    return this.dataSource;
  }

  private buildCategoryBreakdown(
    rows: Array<{ type: string; category_id: string; total: string | number }>,
  ) {
    const catMap = new Map<string, { income: number; expense: number }>();
    for (const r of rows) {
      const entry = catMap.get(r.category_id) ?? { income: 0, expense: 0 };
      if (r.type === 'income') entry.income += Number(r.total);
      else entry.expense += Number(r.total);
      catMap.set(r.category_id, entry);
    }
    return Array.from(catMap.entries()).map(
      ([categoryId, { income, expense }]) => ({
        categoryId,
        totalIncome: income,
        totalExpense: expense,
      }),
    );
  }

  private previousMonth(month: string): string {
    const [year, m] = month.split('-').map(Number);
    const date = new Date(year, m - 1 - 1, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}
