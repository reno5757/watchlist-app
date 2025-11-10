import Database from 'better-sqlite3';
import path from 'path';

let stocksDb: Database.Database | null = null;

export function getStocksDb() {
  if (stocksDb) return stocksDb;

  const dbPath = process.env.SQLITE_STOCKS_PATH
    ? path.resolve(process.cwd(), process.env.SQLITE_STOCKS_PATH)
    : path.resolve(process.cwd(), 'data', 'stocks.db');

  stocksDb = new Database(dbPath, { readonly: true, fileMustExist: true });
  // stocksDb.pragma('journal_mode = WAL');
  return stocksDb;
}
