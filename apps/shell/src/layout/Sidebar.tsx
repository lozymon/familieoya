import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  Target,
  Home,
  Tag,
  BarChart2,
  Settings,
} from 'lucide-react';
import { cn } from '@familieoya/ui';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: CreditCard },
  { to: '/categories', label: 'Categories', icon: Tag },
  { to: '/budgets', label: 'Budgets', icon: Target },
  { to: '/households', label: 'Household', icon: Home },
  { to: '/reports/monthly', label: 'Reports', icon: BarChart2 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center border-b border-slate-200 px-6">
        <span className="text-lg font-bold text-slate-900">Familieøya</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
