import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Idempotency guard for at-least-once RabbitMQ delivery.
 * eventId is the PK — unique constraint prevents double-processing.
 * Rows older than 7 days are cleaned up by a nightly cron.
 */
@Entity('processed_event_ids')
export class ProcessedEventId {
  @PrimaryColumn({ name: 'event_id' })
  eventId!: string;

  @Column({ name: 'processed_at', type: 'timestamptz' })
  processedAt!: Date;
}
