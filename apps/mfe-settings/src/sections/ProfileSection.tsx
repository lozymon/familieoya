import { useContext, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from '@familieoya/ui';
import { apiClient, AuthContext } from '@familieoya/api-client';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  preferredLanguage: z.enum(['en', 'no', 'pt']),
});

type FormValues = z.infer<typeof schema>;

export default function ProfileSection() {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      preferredLanguage: 'en',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setStatus('idle');
    try {
      await apiClient.patch('/auth/me', values);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="flex flex-col gap-4 max-w-md"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Name</label>
            <input
              {...register('name')}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            {errors.name && (
              <p className="text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              {...register('email')}
              type="email"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              Preferred language
            </label>
            <select
              {...register('preferredLanguage')}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="en">English</option>
              <option value="no">Norwegian</option>
              <option value="pt">Portuguese</option>
            </select>
          </div>

          {status === 'success' && (
            <p className="text-sm text-emerald-600">Profile updated.</p>
          )}
          {status === 'error' && (
            <p className="text-sm text-red-600">
              Something went wrong. Please try again.
            </p>
          )}

          <Button type="submit" disabled={isSubmitting} className="self-start">
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
