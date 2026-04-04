import '../styles.css';
import { Target } from 'lucide-react';
import { EmptyState } from '@familieoya/ui';

export default function BudgetPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Budgets
      </h1>
      <EmptyState
        icon={<Target className="h-10 w-10" />}
        title="Budgets coming in Phase 8"
        description="Set monthly spending limits per category and track your progress in real time."
      />
    </div>
  );
}
