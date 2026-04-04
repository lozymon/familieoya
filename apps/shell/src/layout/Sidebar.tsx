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

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/transactions', label: 'Transactions', icon: CreditCard },
      { to: '/categories', label: 'Categories', icon: Tag },
    ],
  },
  {
    label: 'Money',
    items: [
      { to: '/budgets', label: 'Budgets', icon: Target },
      { to: '/reports/monthly', label: 'Reports', icon: BarChart2 },
    ],
  },
  {
    label: 'Household',
    items: [
      { to: '/households', label: 'Members', icon: Home },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-zinc-200 px-5 dark:border-zinc-800">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 dark:bg-emerald-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
            width="14"
            height="14"
          >
            <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
            <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
          </svg>
        </div>
        <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Familieøya
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto p-3 pt-4">
        {navGroups.map(({ label, items }) => (
          <div key={label}>
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              {label}
            </p>
            <div className="flex flex-col gap-0.5">
              {items.map(({ to, label: itemLabel, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-l-2 border-emerald-600 bg-white pl-[10px] text-emerald-700 dark:border-emerald-500 dark:bg-zinc-800 dark:text-emerald-400'
                        : 'text-zinc-600 hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {itemLabel}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
