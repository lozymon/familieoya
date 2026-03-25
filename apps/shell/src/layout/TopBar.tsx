import { Link, useNavigate } from 'react-router-dom';
import { Bell, User, LogOut } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getNotifications } from '@familieoya/api-client';
import { Badge, Button } from '@familieoya/ui';
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
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div />
      <div className="flex items-center gap-3">
        <Link
          to="/notifications"
          className="relative inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-slate-100"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
              {unreadCount}
            </Badge>
          )}
        </Link>

        <Link
          to="/profile"
          className="inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-slate-100"
        >
          <User className="h-5 w-5" />
        </Link>

        <Button variant="ghost" size="icon" onClick={() => void handleLogout()}>
          <LogOut className="h-5 w-5" />
        </Button>

        {user && <span className="text-sm text-slate-600">{user.name}</span>}
      </div>
    </header>
  );
}
