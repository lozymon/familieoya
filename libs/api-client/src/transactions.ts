import { apiClient } from './client';

export interface Transaction {
  id: string;
  householdId: string;
  userId: string;
  type: 'income' | 'expense';
  amount: number; // stored in øre (integer)
  categoryId: string;
  description?: string;
  date: string; // ISO 8601
  createdAt: string;
}

export interface TransactionSummaryItem {
  categoryId: string;
  categoryName: string;
  total: number; // øre
  type: 'income' | 'expense';
}

export interface CreateTransactionDto {
  type: 'income' | 'expense';
  amount: number; // øre
  categoryId: string;
  description?: string;
  date: string;
}

export type UpdateTransactionDto = Partial<CreateTransactionDto>;

export interface ListTransactionsParams {
  month?: string; // YYYY-MM
  categoryId?: string;
  type?: 'income' | 'expense';
}

export async function listTransactions(
  params?: ListTransactionsParams,
): Promise<Transaction[]> {
  const { data } = await apiClient.get<Transaction[]>('/transactions', {
    params,
  });
  return data;
}

export async function getTransaction(id: string): Promise<Transaction> {
  const { data } = await apiClient.get<Transaction>(`/transactions/${id}`);
  return data;
}

export async function createTransaction(
  dto: CreateTransactionDto,
): Promise<Transaction> {
  const { data } = await apiClient.post<Transaction>('/transactions', dto);
  return data;
}

export async function updateTransaction(
  id: string,
  dto: UpdateTransactionDto,
): Promise<Transaction> {
  const { data } = await apiClient.patch<Transaction>(
    `/transactions/${id}`,
    dto,
  );
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  await apiClient.delete(`/transactions/${id}`);
}

export async function bulkDeleteTransactions(ids: string[]): Promise<void> {
  await apiClient.delete('/transactions/bulk', { data: { ids } });
}

export async function getTransactionSummary(
  month?: string,
): Promise<TransactionSummaryItem[]> {
  const { data } = await apiClient.get<TransactionSummaryItem[]>(
    '/transactions/summary',
    { params: month ? { month } : undefined },
  );
  return data;
}
