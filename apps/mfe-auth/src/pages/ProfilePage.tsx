import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMe,
  updateMe,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@familieoya/api-client';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
} from '@familieoya/ui';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  preferredLanguage: z.enum(['en', 'no', 'pt']),
});

type ProfileValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  const { data: prefs } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: getNotificationPreferences,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: user
      ? { name: user.name, preferredLanguage: user.preferredLanguage }
      : undefined,
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateMe,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const updatePrefsMutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['notification-preferences'],
      });
    },
  });

  const onSubmitProfile = async (values: ProfileValues) => {
    await updateProfileMutation.mutateAsync(values);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmitProfile)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email ?? ''}
                disabled
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Email cannot be changed.
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="preferredLanguage">Language</Label>
              <select
                id="preferredLanguage"
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                {...register('preferredLanguage')}
              >
                <option value="en">English</option>
                <option value="no">Norsk</option>
                <option value="pt">Português</option>
              </select>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: 'budgetAlerts', label: 'Budget alerts' },
            { key: 'householdUpdates', label: 'Household updates' },
            { key: 'weeklyDigest', label: 'Weekly spending digest' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 accent-indigo-600"
                checked={prefs?.[key as keyof typeof prefs] ?? true}
                onChange={(e) => {
                  void updatePrefsMutation.mutateAsync({
                    [key]: e.target.checked,
                  });
                }}
              />
              <span className="text-sm dark:text-slate-200">{label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Separator />

      <Button variant="destructive" onClick={() => void handleLogout()}>
        Sign out
      </Button>
    </div>
  );
}
