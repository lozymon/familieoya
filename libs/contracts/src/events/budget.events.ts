import { BaseEvent } from './base';

export const BUDGET_THRESHOLD_WARNING = 'budget.threshold.warning';
export const BUDGET_THRESHOLD_EXCEEDED = 'budget.threshold.exceeded';

export interface BudgetThresholdWarningEvent extends BaseEvent {
  householdId: string;
  categoryId: string;
  percentage: number;
  limitAmount: number;
  spentAmount: number;
}

export interface BudgetThresholdExceededEvent extends BaseEvent {
  householdId: string;
  categoryId: string;
  percentage: number;
  limitAmount: number;
  spentAmount: number;
}
