import '../styles.css';
import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Plus,
  ReceiptText,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Stat,
  EmptyState,
  Badge,
} from '@familieoya/ui';
import {
  getTransactionSummary,
  listTransactions,
  AuthContext,
} from '@familieoya/api-client';

function formatCurrency(amountOre: number, currency = 'NOK'): string {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amountOre / 100);
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
];

export default function DashboardPage() {
  const auth = useContext(AuthContext);
  const householdId = auth?.activeHouseholdId;
  const month = currentMonth();

  const { data: summary = [], isLoading: summaryLoading } = useQuery({
    queryKey: ['transactions', 'summary', month, householdId],
    queryFn: () => getTransactionSummary(month),
    enabled: !!householdId,
  });

  const { data: recentTransactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['transactions', 'list', month, householdId],
    queryFn: () => listTransactions({ month }),
    enabled: !!householdId,
  });

  const isLoading = summaryLoading || txLoading;

  const totalIncome = summary
    .filter((s) => s.type === 'income')
    .reduce((acc, s) => acc + s.total, 0);

  const totalExpense = summary
    .filter((s) => s.type === 'expense')
    .reduce((acc, s) => acc + s.total, 0);

  const net = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0 ? Math.round((net / totalIncome) * 100) : 0;

  const expenseByCategory = summary
    .filter((s) => s.type === 'expense')
    .map((s) => ({ name: s.categoryName, amount: s.total / 100 }))
    .sort((a, b) => b.amount - a.amount);

  const last5 = [...recentTransactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const monthLabel = new Date().toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  if (!householdId) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Dashboard
        </h1>
        <EmptyState
          icon={<Wallet className="h-10 w-10" />}
          title="No household selected"
          description="Create or join a household to start tracking your finances."
          action={
            <Button asChild>
              <Link to="/households">Go to Households</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {monthLabel}
          </p>
        </div>
        <Button asChild>
          <Link to="/transactions/new">
            <Plus className="h-4 w-4" />
            Add transaction
          </Link>
        </Button>
      </div>

      {/* KPI stat row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Income"
          value={isLoading ? '—' : formatCurrency(totalIncome)}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <Stat
          label="Expenses"
          value={isLoading ? '—' : formatCurrency(totalExpense)}
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <Stat
          label="Net"
          value={isLoading ? '—' : formatCurrency(net)}
          icon={<Wallet className="h-4 w-4" />}
        />
        <Stat
          label="Savings rate"
          value={isLoading ? '—' : `${savingsRate}%`}
          icon={<PiggyBank className="h-4 w-4" />}
        />
      </div>

      {/* Spending by category chart */}
      {!isLoading && expenseByCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Spending by category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={expenseByCategory}
                margin={{ top: 4, right: 8, left: 8, bottom: 40 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--chart-grid)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--chart-text)' }}
                  angle={-35}
                  textAnchor="end"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--chart-text)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    new Intl.NumberFormat('nb-NO', {
                      notation: 'compact',
                    }).format(v)
                  }
                />
                <Tooltip
                  cursor={{ fill: 'var(--chart-grid)', opacity: 0.5 }}
                  contentStyle={{
                    background: 'var(--chart-tooltip-bg)',
                    border: '1px solid var(--chart-tooltip-border)',
                    borderRadius: '8px',
                    color: 'var(--chart-tooltip-text)',
                    fontSize: '13px',
                  }}
                  formatter={(value: number) => [
                    new Intl.NumberFormat('nb-NO', {
                      style: 'currency',
                      currency: 'NOK',
                      minimumFractionDigits: 0,
                    }).format(value),
                    'Amount',
                  ]}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {expenseByCategory.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Recent transactions
          </CardTitle>
          <Link
            to="/transactions"
            className="text-sm text-emerald-600 hover:underline dark:text-emerald-400"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {!isLoading && last5.length === 0 && (
            <EmptyState
              icon={<ReceiptText className="h-8 w-8" />}
              title="No transactions this month"
              description="Add your first transaction to get started."
              action={
                <Button asChild size="sm">
                  <Link to="/transactions/new">
                    <Plus className="h-4 w-4" />
                    Add transaction
                  </Link>
                </Button>
              }
              className="py-10"
            />
          )}
          {last5.length > 0 && (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {last5.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-center justify-between px-6 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={tx.type === 'income' ? 'income' : 'expense'}
                    >
                      {tx.type === 'income' ? 'In' : 'Out'}
                    </Badge>
                    <span className="text-zinc-800 dark:text-zinc-200">
                      {tx.description ?? '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      {new Date(tx.date).toLocaleDateString('nb-NO', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <span
                      className={`tabular-nums font-medium ${
                        tx.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {tx.type === 'expense' ? '−' : '+'}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
