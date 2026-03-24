import { DataSource } from 'typeorm';

/**
 * Truncates all tables in the test database between test runs.
 * Uses session_replication_role to bypass FK constraints during truncation.
 */
export async function resetDatabase(dataSource: DataSource): Promise<void> {
  await dataSource.query("SET session_replication_role = 'replica'");
  for (const entity of dataSource.entityMetadatas) {
    await dataSource.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE`);
  }
  await dataSource.query("SET session_replication_role = 'DEFAULT'");
}
