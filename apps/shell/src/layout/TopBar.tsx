import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getNotifications } from '@familieoya/api-client';
import { Button, ThemeToggle } from '@familieoya/ui';
import { useAuth } from '../contexts/AuthContext';

export function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Left: user greeting */}
      {user && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Welcome back,{' '}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {user.name}
          </span>
        </p>
      )}
      {!user && <div />}

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        <ThemeToggle />

        <Link
          to="/notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-semibold text-white dark:bg-emerald-500">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <Link
          to="/settings/profile"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
          aria-label="Profile"
        >
          {user?.name?.charAt(0).toUpperCase() ?? '?'}
        </Link>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => void handleLogout()}
          aria-label="Log out"
          className="h-9 w-9 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
