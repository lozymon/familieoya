import '../styles.css';
import { useContext, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Badge, Card, CardContent } from '@familieoya/ui';
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
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-slate-500">
              No household selected. Go to{' '}
              <Link to="/households" className="underline text-slate-900">
                Households
              </Link>{' '}
              to create or join one.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <Button asChild>
          <Link to="/transactions/new">
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="month"
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setSelected(new Set());
          }}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />

        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setSelected(new Set());
          }}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
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
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        {selected.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            onClick={() => bulkDelete([...selected])}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete {selected.size} selected
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    transactions.length > 0 &&
                    selected.size === transactions.length
                  }
                  onChange={toggleAll}
                  className="cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Date
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Description
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Category
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Type
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">
                Amount
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && transactions.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No transactions found.
                </td>
              </tr>
            )}
            {transactions.map((t: Transaction) => (
              <tr
                key={t.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(t.id)}
                    onChange={() => toggleSelect(t.id)}
                    className="cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {new Date(t.date).toLocaleDateString('nb-NO')}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {t.description ?? <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {getCategoryName(t.categoryId)}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={
                      t.type === 'income'
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-red-100 text-red-700 hover:bg-red-100'
                    }
                  >
                    {t.type}
                  </Badge>
                </td>
                <td
                  className={`px-4 py-3 text-right font-medium ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  {t.type === 'income' ? '+' : '-'}
                  {formatCurrency(t.amount)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/transactions/${t.id}/edit`}
                    className="text-xs text-slate-500 underline hover:text-slate-900"
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
  );
}
