// lib/db-metrics.ts
import Database from 'better-sqlite3';
import path from 'path';

let metricsDb: Database.Database | null = null;

export function getMetricsDb() {
  if (metricsDb) return metricsDb;

  const dbPath = process.env.SQLITE_METRICS_PATH
    ? path.resolve(process.cwd(), process.env.SQLITE_METRICS_PATH)
    : path.resolve(process.cwd(), 'data', 'metrics.db');

  metricsDb = new Database(dbPath, { fileMustExist: true });
  metricsDb.pragma('journal_mode = WAL');
  metricsDb.pragma('foreign_keys = ON');

  return metricsDb;
}
