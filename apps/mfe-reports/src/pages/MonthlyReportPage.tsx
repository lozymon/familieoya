import '../styles.css';
import { useContext, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { TrendingUp, TrendingDown, Wallet, Download } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from '@familieoya/ui';
import {
  getMonthlyReport,
  downloadCsvReport,
  AuthContext,
} from '@familieoya/api-client';

function formatCurrency(amountOre: number): string {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    minimumFractionDigits: 0,
  }).format(amountOre / 100);
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#84cc16',
];

export default function MonthlyReportPage() {
  const auth = useContext(AuthContext);
  const householdId = auth?.activeHouseholdId;
  const [month, setMonth] = useState(currentMonth());
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', 'monthly', month, householdId],
    queryFn: () => getMonthlyReport(householdId!, month),
    enabled: !!householdId,
  });

  if (!householdId) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Monthly Report</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-slate-500">No household selected.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expenseBreakdown = (report?.categoryBreakdown ?? [])
    .filter((c) => c.type === 'expense')
    .map((c) => ({
      name: c.categoryId,
      amount: c.total / 100,
    }))
    .sort((a, b) => b.amount - a.amount);

  const incomePct =
    report?.previousMonth != null
      ? pctChange(report.totalIncome, report.previousMonth.totalIncome)
      : null;

  const expensePct =
    report?.previousMonth != null
      ? pctChange(report.totalExpense, report.previousMonth.totalExpense)
      : null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadCsvReport({ month });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Monthly Report</h1>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={isDownloading || !report}
            onClick={() => void handleDownload()}
          >
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Income
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              {isLoading ? '—' : formatCurrency(report?.totalIncome ?? 0)}
            </p>
            {incomePct !== null && (
              <p
                className={`text-xs mt-1 ${incomePct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
              >
                {incomePct >= 0 ? '+' : ''}
                {incomePct}% vs previous month
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Expenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {isLoading ? '—' : formatCurrency(report?.totalExpense ?? 0)}
            </p>
            {expensePct !== null && (
              <p
                className={`text-xs mt-1 ${expensePct <= 0 ? 'text-emerald-600' : 'text-red-600'}`}
              >
                {expensePct >= 0 ? '+' : ''}
                {expensePct}% vs previous month
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Net
            </CardTitle>
            <Wallet className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${(report?.net ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
            >
              {isLoading ? '—' : formatCurrency(report?.net ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown chart */}
      {!isLoading && expenseBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expense by category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={expenseBreakdown}
                margin={{ top: 4, right: 8, left: 8, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  angle={-35}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: number) =>
                    new Intl.NumberFormat('nb-NO', {
                      notation: 'compact',
                    }).format(v)
                  }
                />
                <Tooltip
                  formatter={(value: number) =>
                    new Intl.NumberFormat('nb-NO', {
                      style: 'currency',
                      currency: 'NOK',
                      minimumFractionDigits: 0,
                    }).format(value)
                  }
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {expenseBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {!isLoading && expenseBreakdown.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-slate-500">
              No expense data for this month.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
