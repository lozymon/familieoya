import '../styles.css';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Check, X, Plus, Tag } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Badge,
  EmptyState,
} from '@familieoya/ui';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
} from '@familieoya/api-client';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
});
type FormValues = z.infer<typeof schema>;

function EditRow({
  category,
  onDone,
}: {
  category: Category;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: category.name },
  });

  const { mutate: save } = useMutation({
    mutationFn: (values: FormValues) =>
      updateCategory(category.id, { name: values.name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      onDone();
    },
  });

  return (
    <form
      onSubmit={handleSubmit((v) => save(v))}
      className="flex flex-1 items-center gap-2"
    >
      <Input {...register('name')} className="h-8 text-sm" autoFocus />
      {errors.name && (
        <span className="text-xs text-rose-600">{errors.name.message}</span>
      )}
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={onDone}
      >
        <X className="h-4 w-4" />
      </Button>
    </form>
  );
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const { mutate: addCategory } = useMutation({
    mutationFn: (values: FormValues) => createCategory({ name: values.name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      reset();
    },
    onError: () => setError('root', { message: 'Failed to create category.' }),
  });

  const { mutate: remove } = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const seeded = categories.filter((c) => c.key !== null);
  const custom = categories.filter((c) => c.key === null);

  return (
    <div className="flex flex-col gap-8">
      {/* Page header — Variant B */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Categories
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your spending categories
          </p>
        </div>
      </div>

      {/* Add custom category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Add custom category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((v) => addCategory(v))}
            noValidate
            className="flex flex-col gap-4"
          >
            <div className="flex gap-3">
              <Input
                id="new-name"
                placeholder="e.g. Gym membership"
                className="max-w-sm"
                {...register('name')}
              />
              <Button type="submit" disabled={isSubmitting}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            {errors.name && (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                {errors.name.message}
              </p>
            )}
            {errors.root && (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                {errors.root.message}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Custom categories */}
      {custom.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Custom categories
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {custom.map((c) => (
                <li key={c.id} className="flex items-center gap-2 px-6 py-3">
                  {editingId === c.id ? (
                    <EditRow category={c} onDone={() => setEditingId(null)} />
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {c.name}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-zinc-400 hover:text-zinc-700"
                        onClick={() => setEditingId(c.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                        onClick={() => remove(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Default (seeded) categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Default categories
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <p className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
              Loading…
            </p>
          )}
          {!isLoading && seeded.length === 0 && (
            <EmptyState
              icon={<Tag className="h-8 w-8" />}
              title="No default categories"
              description="Default categories appear here once the backend is connected."
              className="py-10"
            />
          )}
          {!isLoading && seeded.length > 0 && (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {seeded.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between px-6 py-3"
                >
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {c.name}
                  </span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {c.key}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
