// lib/db-breadth.ts
import Database from 'better-sqlite3';
import path from 'path';

let breadthDb: Database.Database | null = null;

export default function getBreadthDb() {
  if (breadthDb) return breadthDb;

  const dbPath = process.env.SQLITE_BREADTH_PATH
    ? path.resolve(process.cwd(), process.env.SQLITE_BREADTH_PATH)
    : path.resolve(process.cwd(), 'data', 'breadth.db'); // adjust path if needed

  breadthDb = new Database(dbPath, { fileMustExist: true });
  breadthDb.pragma('journal_mode = WAL');
  breadthDb.pragma('foreign_keys = ON');

  return breadthDb;
}
