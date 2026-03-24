import { DataSource } from 'typeorm';

/**
 * Truncates all tables in the test database between test runs.
 * RESTART IDENTITY resets sequences; CASCADE handles FK order automatically.
 */
export async function resetDatabase(dataSource: DataSource): Promise<void> {
  const tableNames = dataSource.entityMetadatas
    .map((e) => `"${e.tableName}"`)
    .join(', ');
  if (tableNames) {
    await dataSource.query(
      `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`,
    );
  }
}
