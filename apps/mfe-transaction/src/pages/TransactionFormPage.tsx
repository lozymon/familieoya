import '../styles.css';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@familieoya/ui';
import {
  createTransaction,
  updateTransaction,
  getTransaction,
  listCategories,
} from '@familieoya/api-client';

const schema = z.object({
  type: z.enum(['income', 'expense']),
  amountDisplay: z
    .string()
    .regex(/^\d+([.,]\d{1,2})?$/, 'Enter a valid amount (e.g. 100 or 99.50)'),
  categoryId: z.string().min(1, 'Select a category'),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
});

type FormValues = z.infer<typeof schema>;

export default function TransactionFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  });

  const { data: existing } = useQuery({
    queryKey: ['transaction', id],
    queryFn: () => getTransaction(id!),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'expense',
      date: new Date().toISOString().slice(0, 10),
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        type: existing.type,
        amountDisplay: (existing.amount / 100).toFixed(2),
        categoryId: existing.categoryId,
        description: existing.description ?? '',
        date: existing.date.slice(0, 10),
      });
    }
  }, [existing, reset]);

  const { mutate: save } = useMutation({
    mutationFn: (dto: {
      type: 'income' | 'expense';
      amount: number;
      categoryId: string;
      description?: string;
      date: string;
    }) => (isEdit ? updateTransaction(id!, dto) : createTransaction(dto)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      navigate('/transactions');
    },
    onError: () => {
      setError('root', { message: 'Failed to save transaction. Try again.' });
    },
  });

  const onSubmit = (values: FormValues) => {
    const amountOre = Math.round(
      parseFloat(values.amountDisplay.replace(',', '.')) * 100,
    );
    save({
      type: values.type,
      amount: amountOre,
      categoryId: values.categoryId,
      description: values.description || undefined,
      date: values.date,
    });
  };

  const selectedType = watch('type');

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold dark:text-slate-100">
        {isEdit ? 'Edit transaction' : 'Add transaction'}
      </h1>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Transaction details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-1">
              <Label>Type</Label>
              <div className="flex gap-2">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setValue('type', t)}
                    className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
                      selectedType === t
                        ? t === 'expense'
                          ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700'
                          : 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="amountDisplay">Amount</Label>
              <Input
                id="amountDisplay"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                {...register('amountDisplay')}
              />
              {errors.amountDisplay && (
                <p className="text-sm text-red-500">
                  {errors.amountDisplay.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="categoryId">Category</Label>
              <select
                id="categoryId"
                {...register('categoryId')}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="text-sm text-red-500">
                  {errors.categoryId.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                type="text"
                placeholder="e.g. Grocery shopping"
                {...register('description')}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...register('date')} />
              {errors.date && (
                <p className="text-sm text-red-500">{errors.date.message}</p>
              )}
            </div>

            {errors.root && (
              <p className="text-sm text-red-500">{errors.root.message}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
