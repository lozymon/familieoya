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
import { TrendingUp, TrendingDown, Wallet, Plus } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from '@familieoya/ui';
import { getTransactionSummary, AuthContext } from '@familieoya/api-client';

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

export default function DashboardPage() {
  const auth = useContext(AuthContext);
  const householdId = auth?.activeHouseholdId;

  const { data: summary = [], isLoading } = useQuery({
    queryKey: ['transactions', 'summary', currentMonth(), householdId],
    queryFn: () => getTransactionSummary(currentMonth()),
    enabled: !!householdId,
  });

  const totalIncome = summary
    .filter((s) => s.type === 'income')
    .reduce((acc, s) => acc + s.total, 0);

  const totalExpense = summary
    .filter((s) => s.type === 'expense')
    .reduce((acc, s) => acc + s.total, 0);

  const net = totalIncome - totalExpense;

  const expenseByCategory = summary
    .filter((s) => s.type === 'expense')
    .map((s) => ({
      name: s.categoryName,
      amount: s.total / 100,
    }))
    .sort((a, b) => b.amount - a.amount);

  const COLORS = [
    '#6366f1',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#06b6d4',
    '#f97316',
    '#84cc16',
  ];

  if (!householdId) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold dark:text-slate-100">
          Dashboard
        </h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-slate-500 dark:text-slate-400">
              No household selected. Go to{' '}
              <Link
                to="/households"
                className="underline text-indigo-600 dark:text-indigo-400"
              >
                Households
              </Link>{' '}
              to create or join one.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const monthLabel = new Date().toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold dark:text-slate-100">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {monthLabel}
          </p>
        </div>
        <Button asChild>
          <Link to="/transactions/new">
            <Plus className="mr-2 h-4 w-4" />
            Add transaction
          </Link>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Income
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {isLoading ? '—' : formatCurrency(totalIncome)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Expenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {isLoading ? '—' : formatCurrency(totalExpense)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Net
            </CardTitle>
            <Wallet className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
            >
              {isLoading ? '—' : formatCurrency(net)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Spending by category chart */}
      {!isLoading && expenseByCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="dark:text-slate-100">
              Spending by category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={expenseByCategory}
                margin={{ top: 4, right: 8, left: 8, bottom: 40 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--chart-grid, #e2e8f0)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: 'var(--chart-text, #64748b)' }}
                  angle={-35}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--chart-text, #64748b)' }}
                  tickFormatter={(v: number) =>
                    new Intl.NumberFormat('nb-NO', {
                      notation: 'compact',
                    }).format(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--chart-tooltip-bg, #ffffff)',
                    border: '1px solid var(--chart-tooltip-border, #e2e8f0)',
                    borderRadius: '8px',
                    color: 'var(--chart-tooltip-text, #0f172a)',
                  }}
                  formatter={(value: number) =>
                    new Intl.NumberFormat('nb-NO', {
                      style: 'currency',
                      currency: 'NOK',
                      minimumFractionDigits: 0,
                    }).format(value)
                  }
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {expenseByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {!isLoading && expenseByCategory.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-slate-500 dark:text-slate-400">
              No transactions this month.{' '}
              <Link
                to="/transactions/new"
                className="underline text-indigo-600 dark:text-indigo-400"
              >
                Add your first one.
              </Link>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
