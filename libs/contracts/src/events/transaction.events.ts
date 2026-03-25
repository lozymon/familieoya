import { BaseEvent } from './base';

export interface TransactionCreatedEvent extends BaseEvent {
  transactionId: string;
  householdId: string;
  categoryId: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
}

export interface TransactionUpdatedEvent extends BaseEvent {
  transactionId: string;
  householdId: string;
  // new values
  categoryId: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  // previous values — needed by budget-service to undo old state
  previousCategoryId: string;
  previousAmount: number;
  previousType: 'income' | 'expense';
  previousDate: string;
}

export interface TransactionDeletedEvent extends BaseEvent {
  transactionId: string;
  householdId: string;
  categoryId: string;
  previousAmount: number;
  type: 'income' | 'expense';
  /** ISO 8601 date of the deleted transaction — needed by budget-service to subtract from the correct month. */
  date: string;
}

export const TRANSACTION_CREATED = 'transaction.created';
export const TRANSACTION_UPDATED = 'transaction.updated';
export const TRANSACTION_DELETED = 'transaction.deleted';
