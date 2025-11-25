import Database from 'better-sqlite3';
import path from 'path';

let stocksListsDb: Database.Database | null = null;

export function getStocksListsDb() {
  if (stocksListsDb) return stocksListsDb;

  // Optional env var override
  const dbPath = process.env.SQLITE_STOCKS_LISTS_PATH
    ? path.resolve(process.cwd(), process.env.SQLITE_STOCKS_LISTS_PATH)
    : path.resolve(process.cwd(), 'data', 'stocks_lists.db');

  stocksListsDb = new Database(dbPath, { fileMustExist: true });
  stocksListsDb.pragma('journal_mode = WAL');
  stocksListsDb.pragma('foreign_keys = ON');

  return stocksListsDb;
}
