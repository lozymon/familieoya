import '../styles.css';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Badge,
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
      className="flex items-center gap-2"
    >
      <Input {...register('name')} className="h-8 text-sm" autoFocus />
      {errors.name && (
        <span className="text-xs text-red-500">{errors.name.message}</span>
      )}
      <Button type="submit" size="icon" variant="ghost" className="h-8 w-8">
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
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const { mutate: addCategory } = useMutation({
    mutationFn: (values: FormValues) => createCategory({ name: values.name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      reset();
    },
    onError: () => {
      setError('root', { message: 'Failed to create category.' });
    },
  });

  const { mutate: remove } = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const seeded = categories.filter((c) => c.key !== null);
  const custom = categories.filter((c) => c.key === null);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Categories</h1>

      {/* Add new */}
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Add custom category</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((v) => addCategory(v))}
            className="flex gap-2"
            noValidate
          >
            <div className="flex-1 space-y-1">
              <Label htmlFor="new-name" className="sr-only">
                Name
              </Label>
              <Input
                id="new-name"
                placeholder="Category name"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
              {errors.root && (
                <p className="text-xs text-red-500">{errors.root.message}</p>
              )}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Seeded categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default categories</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="px-4 py-3 text-sm text-slate-500">Loading…</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {seeded.map((c) => (
                <li key={c.id} className="flex items-center px-4 py-3">
                  <span className="flex-1 text-sm">{c.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {c.key}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Custom categories */}
      {custom.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custom categories</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-slate-100">
              {custom.map((c) => (
                <li key={c.id} className="flex items-center gap-2 px-4 py-3">
                  {editingId === c.id ? (
                    <EditRow category={c} onDone={() => setEditingId(null)} />
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{c.name}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setEditingId(c.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
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
    </div>
  );
}
