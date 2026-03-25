import { DataSource, QueryRunner } from 'typeorm';

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '23505'
  );
}

/**
 * Wraps a state-mutating function in an idempotency guard.
 *
 * Inserts the eventId into `processed_event_ids` and runs `fn` inside a
 * single database transaction. If the eventId already exists (unique
 * constraint violation) the function returns without calling `fn` — the
 * caller should ack the message. Any other error is re-thrown so the
 * caller does NOT ack and RabbitMQ redelivers.
 *
 * Usage:
 *   await withIdempotency(dataSource, event.eventId, async (qr) => {
 *     await qr.manager.update(...)
 *   })
 *   channel.ack(message)
 */
export async function withIdempotency(
  dataSource: DataSource,
  eventId: string,
  fn: (queryRunner: QueryRunner) => Promise<void>,
): Promise<void> {
  const qr = dataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    await qr.manager.query(
      `INSERT INTO processed_event_ids (event_id, processed_at)
       VALUES ($1, NOW())`,
      [eventId],
    );
    await fn(qr);
    await qr.commitTransaction();
  } catch (err) {
    await qr.rollbackTransaction();
    if (isUniqueConstraintError(err)) return; // already processed — safe to ack
    throw err;
  } finally {
    await qr.release();
  }
}
