import { BaseEvent } from './base';

export interface ReportExportedEvent extends BaseEvent {
  householdId: string;
  userId: string;
  reportType: 'monthly' | 'yearly' | 'member';
  format: 'csv';
}

export const REPORT_EXPORTED = 'report.exported';
