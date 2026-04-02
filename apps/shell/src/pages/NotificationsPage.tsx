import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check } from 'lucide-react';
import { getNotifications, markNotificationRead } from '@familieoya/api-client';
import { Button, Badge } from '@familieoya/ui';

export function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  });

  const { mutate: markRead } = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold dark:text-slate-100">
          Notifications
        </h1>
        {unread.length > 0 && <Badge>{unread.length} unread</Badge>}
      </div>

      {isLoading && (
        <p className="text-slate-500 dark:text-slate-400">Loading…</p>
      )}

      {!isLoading && notifications.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400 dark:text-slate-500">
          <Bell className="h-10 w-10" />
          <p>No notifications yet.</p>
        </div>
      )}

      {!isLoading && notifications.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:divide-slate-700">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 px-4 py-3 ${!n.read ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 dark:text-slate-200">
                  {n.message}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {new Date(n.createdAt).toLocaleString('nb-NO')}
                </p>
              </div>
              {!n.read && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  onClick={() => markRead(n.id)}
                  title="Mark as read"
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
