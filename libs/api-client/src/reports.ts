import { apiClient } from './client';

export interface MonthlyReport {
  month: string;
  totalIncome: number;
  totalExpense: number;
  net: number;
  categoryBreakdown: {
    categoryId: string;
    type: 'income' | 'expense';
    total: number;
  }[];
  previousMonth?: { totalIncome: number; totalExpense: number };
}

export interface YearlyReport {
  year: string;
  totalIncome: number;
  totalExpense: number;
  monthlyBreakdown: { month: string; income: number; expense: number }[];
}

export interface MemberReport {
  month: string;
  members: {
    userId: string;
    totalIncome: number;
    totalExpense: number;
    categoryBreakdown: { categoryId: string; type: string; total: number }[];
  }[];
}

export interface ExportHistoryItem {
  id: string;
  reportType: 'monthly' | 'yearly' | 'member';
  format: 'csv';
  createdAt: string;
}

export async function getMonthlyReport(
  householdId: string,
  month: string,
): Promise<MonthlyReport> {
  const { data } = await apiClient.get<MonthlyReport>('/reports/monthly', {
    params: { month },
  });
  return data;
}

export async function getYearlyReport(
  householdId: string,
  year: string,
): Promise<YearlyReport> {
  const { data } = await apiClient.get<YearlyReport>('/reports/yearly', {
    params: { year },
  });
  return data;
}

export async function getMemberReport(
  householdId: string,
  month: string,
): Promise<MemberReport> {
  const { data } = await apiClient.get<MemberReport>('/reports/member', {
    params: { month },
  });
  return data;
}

export async function getExportHistory(
  householdId: string,
): Promise<ExportHistoryItem[]> {
  const { data } = await apiClient.get<ExportHistoryItem[]>(
    '/reports/export/history',
  );
  return data;
}

// Returns blob URL for download
export async function downloadCsvReport(params: {
  month?: string;
  year?: string;
}): Promise<void> {
  const response = await apiClient.get('/reports/export/csv', {
    params,
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report-${params.month ?? params.year ?? 'export'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
