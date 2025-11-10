import Database from 'better-sqlite3';
import path from 'path';

let appDb: Database.Database | null = null;

export function getAppDb() {
  if (appDb) return appDb;

  const dbPath = process.env.SQLITE_APP_PATH
    ? path.resolve(process.cwd(), process.env.SQLITE_APP_PATH)
    : path.resolve(process.cwd(), 'data', 'app_data.db');

  appDb = new Database(dbPath, { fileMustExist: true });
  appDb.pragma('journal_mode = WAL');
  appDb.pragma('foreign_keys = ON');

  return appDb;
}
