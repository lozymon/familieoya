import '../styles.css';
import { useContext, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Trash2, ReceiptText, X } from 'lucide-react';
import { Button, Badge, EmptyState } from '@familieoya/ui';
import {
  listTransactions,
  listCategories,
  bulkDeleteTransactions,
  AuthContext,
  type Transaction,
} from '@familieoya/api-client';

function formatCurrency(amountOre: number): string {
  return new Intl.NumberFormat('nb-NO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountOre / 100);
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

const filterCls =
  'rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

export default function TransactionListPage() {
  const auth = useContext(AuthContext);
  const householdId = auth?.activeHouseholdId;
  const queryClient = useQueryClient();

  const [month, setMonth] = useState(currentMonth());
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState<'' | 'income' | 'expense'>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', month, filterCategory, filterType, householdId],
    queryFn: () =>
      listTransactions({
        month,
        categoryId: filterCategory || undefined,
        type: filterType || undefined,
      }),
    enabled: !!householdId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', householdId],
    queryFn: listCategories,
    enabled: !!householdId,
  });

  const { mutate: bulkDelete, isPending: isDeleting } = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteTransactions(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setSelected(new Set());
    },
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === transactions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(transactions.map((t) => t.id)));
    }
  };

  const getCategoryName = (categoryId: string) =>
    categories.find((c) => c.id === categoryId)?.name ?? '—';

  if (!householdId) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Transactions
        </h1>
        <EmptyState
          icon={<ReceiptText className="h-10 w-10" />}
          title="No household selected"
          description="Create or join a household to start tracking transactions."
          action={
            <Button asChild>
              <Link to="/households">Go to Households</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const allSelected =
    transactions.length > 0 && selected.size === transactions.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Transactions
        </h1>
        <Button asChild>
          <Link to="/transactions/new">
            <Plus className="h-4 w-4" />
            Add transaction
          </Link>
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <input
          type="month"
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setSelected(new Set());
          }}
          className={filterCls}
        />
        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setSelected(new Set());
          }}
          className={filterCls}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value as '' | 'income' | 'expense');
            setSelected(new Set());
          }}
          className={filterCls}
        >
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      {/* Bulk action bar — slides in when rows are selected */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 dark:border-zinc-700 dark:bg-zinc-800">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
              className="text-zinc-500"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={() => bulkDelete([...selected])}
            >
              <Trash2 className="h-4 w-4" />
              Delete {selected.size}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 dark:border-zinc-800">
              <tr className="bg-zinc-50 dark:bg-zinc-800/60">
                <th className="w-10 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="cursor-pointer accent-emerald-600"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Type
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Amount
                </th>
                <th className="w-16 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-zinc-400 dark:text-zinc-500"
                  >
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && transactions.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<ReceiptText className="h-8 w-8" />}
                      title="No transactions found"
                      description="Try adjusting your filters or add a new transaction."
                      action={
                        <Button asChild size="sm">
                          <Link to="/transactions/new">
                            <Plus className="h-4 w-4" />
                            Add transaction
                          </Link>
                        </Button>
                      }
                      className="py-12"
                    />
                  </td>
                </tr>
              )}
              {transactions.map((t: Transaction, i: number) => (
                <tr
                  key={t.id}
                  className={
                    i % 2 === 0
                      ? 'bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/60'
                      : 'bg-zinc-50/60 hover:bg-zinc-100/60 dark:bg-zinc-800/30 dark:hover:bg-zinc-800/60'
                  }
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={() => toggleSelect(t.id)}
                      className="cursor-pointer accent-emerald-600"
                    />
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {new Date(t.date).toLocaleDateString('nb-NO')}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {t.description ?? (
                      <span className="font-normal text-zinc-400 dark:text-zinc-500">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {getCategoryName(t.categoryId)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={t.type === 'income' ? 'income' : 'expense'}>
                      {t.type}
                    </Badge>
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums font-medium ${
                      t.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '−'}
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/transactions/${t.id}/edit`}
                      className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
