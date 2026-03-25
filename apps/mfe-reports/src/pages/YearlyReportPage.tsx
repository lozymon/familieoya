import '../styles.css';
import { useContext, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Download } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from '@familieoya/ui';
import {
  getYearlyReport,
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

function currentYear(): string {
  return String(new Date().getFullYear());
}

export default function YearlyReportPage() {
  const auth = useContext(AuthContext);
  const householdId = auth?.activeHouseholdId;
  const [year, setYear] = useState(currentYear());
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', 'yearly', year, householdId],
    queryFn: () => getYearlyReport(householdId!, year),
    enabled: !!householdId,
  });

  if (!householdId) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Yearly Report</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-slate-500">No household selected.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const chartData = (report?.monthlyBreakdown ?? []).map((m) => ({
    month: m.month,
    Income: m.income / 100,
    Expense: m.expense / 100,
  }));

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadCsvReport({ year });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Yearly Report</h1>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={year}
            min="2000"
            max="2100"
            onChange={(e) => setYear(e.target.value)}
            className="w-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
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
      <div className="grid gap-4 sm:grid-cols-2">
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
          </CardContent>
        </Card>
      </div>

      {/* Monthly breakdown chart */}
      {!isLoading && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly breakdown — {year}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={chartData}
                margin={{ top: 4, right: 8, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
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
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Income"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Expense"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {!isLoading && chartData.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-slate-500">
              No data available for {year}.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
