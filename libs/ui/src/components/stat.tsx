import * as React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../lib/utils';
import { Card, CardContent } from './card';

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string;
  trend?: number; // percentage change vs previous period, e.g. 12.5 or -8.3
  comparison?: string; // e.g. "vs last month: kr 37 900"
  icon?: React.ReactNode;
}

export function Stat({
  label,
  value,
  trend,
  comparison,
  icon,
  className,
  ...props
}: StatProps) {
  const trendPositive = trend !== undefined && trend > 0;
  const trendNegative = trend !== undefined && trend < 0;
  const trendNeutral = trend !== undefined && trend === 0;

  return (
    <Card className={cn('p-4', className)} {...props}>
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {label}
            </p>
            <p className="tabular-nums text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {value}
            </p>
            {comparison && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {comparison}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {icon && (
              <div className="text-zinc-400 dark:text-zinc-500">{icon}</div>
            )}
            {trend !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
                  trendPositive &&
                    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
                  trendNegative &&
                    'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
                  trendNeutral &&
                    'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
                )}
              >
                {trendPositive && <TrendingUp className="h-3 w-3" />}
                {trendNegative && <TrendingDown className="h-3 w-3" />}
                {trendNeutral && <Minus className="h-3 w-3" />}
                {Math.abs(trend).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
