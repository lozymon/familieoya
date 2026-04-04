import * as React from 'react';
import { cn } from '../lib/utils';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // current amount (in øre/cents)
  max: number; // limit amount (in øre/cents)
  label: string; // category name
  valueLabel: string; // formatted current amount
  maxLabel: string; // formatted limit amount
}

function getProgressColor(pct: number): string {
  if (pct >= 100) return 'bg-rose-500 dark:bg-rose-400';
  if (pct >= 80) return 'bg-amber-500 dark:bg-amber-400';
  return 'bg-emerald-500 dark:bg-emerald-400';
}

function getPercentBadgeClass(pct: number): string {
  if (pct >= 100)
    return 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400';
  if (pct >= 80)
    return 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400';
  return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400';
}

export function ProgressBar({
  value,
  max,
  label,
  valueLabel,
  maxLabel,
  className,
  ...props
}: ProgressBarProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const barWidth = Math.min(pct, 100);

  return (
    <div className={cn('flex flex-col gap-1.5', className)} {...props}>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {label}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="tabular-nums text-sm text-zinc-500 dark:text-zinc-400">
            {valueLabel} / {maxLabel}
          </span>
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
              getPercentBadgeClass(pct),
            )}
          >
            {pct}%
          </span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            getProgressColor(pct),
          )}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}
