import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400',
        secondary:
          'border-transparent bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600',
        destructive:
          'border-transparent bg-rose-500 text-white hover:bg-rose-600',
        outline: 'text-zinc-900 dark:text-zinc-300 dark:border-zinc-600',
        income:
          'border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
        expense:
          'border-transparent bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
        warning:
          'border-transparent bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
        admin:
          'border-transparent bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
        member:
          'border-transparent bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
