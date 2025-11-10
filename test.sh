# file: convert_to_sqlite.sh
set -euo pipefail

DB_IN="data/stocks.duckdb"
DB_OUT="data/stocks.sqlite"

duckdb "$DB_IN" <<'SQL'
-- Enable SQLite writer
INSTALL sqlite;
LOAD sqlite;

-- Attach destination SQLite DB (will create if missing)
ATTACH 'data/stocks.sqlite' AS sqlite_db (TYPE SQLITE);

-- === stock_data ===
DROP TABLE IF EXISTS sqlite_db.stock_data;
CREATE TABLE sqlite_db.stock_data AS
SELECT
  ticker,
  CAST(date AS TEXT) AS date,    -- store ISO8601 text in SQLite
  close,
  volume
FROM stock_data;

-- === metrics_daily ===
DROP TABLE IF EXISTS sqlite_db.metrics_daily;
CREATE TABLE sqlite_db.metrics_daily AS
SELECT
  ticker,
  CAST(date AS TEXT) AS date,
  close,
  perf_d, perf_w, perf_m, perf_3m, perf_6m, perf_12m, ytd,
  ma10, ma20, ma50, ma200,
  CAST(above_ma10  AS INTEGER) AS above_ma10,
  CAST(above_ma20  AS INTEGER) AS above_ma20,
  CAST(above_ma50  AS INTEGER) AS above_ma50,
  CAST(above_ma200 AS INTEGER) AS above_ma200
FROM metrics_daily;

-- === metrics_snapshot ===
DROP TABLE IF EXISTS sqlite_db.metrics_snapshot;
CREATE TABLE sqlite_db.metrics_snapshot AS
SELECT
  ticker,
  CAST(asof_date AS TEXT) AS asof_date,
  last_close,
  ytd,
  perf_d, perf_w, perf_m, perf_3m, perf_6m, perf_12m,
  ma10, ma20, ma50, ma200,
  CAST(above_ma10  AS INTEGER) AS above_ma10,
  CAST(above_ma20  AS INTEGER) AS above_ma20,
  CAST(above_ma50  AS INTEGER) AS above_ma50,
  CAST(above_ma200 AS INTEGER) AS above_ma200
FROM metrics_snapshot;

-- === watchlists / items / comments ===
DROP TABLE IF EXISTS sqlite_db.watchlists;
CREATE TABLE sqlite_db.watchlists AS
SELECT
  id, title, intro, default_sort,
  CAST(group_by_subcategory AS INTEGER) AS group_by_subcategory,
  CAST(created_at AS TEXT) AS created_at
FROM watchlists;

DROP TABLE IF EXISTS sqlite_db.watchlist_items;
CREATE TABLE sqlite_db.watchlist_items AS
SELECT
  watchlist_id, ticker, subcategory, layout_meta,
  CAST(created_at AS TEXT) AS created_at
FROM watchlist_items;

DROP TABLE IF EXISTS sqlite_db.comments;
CREATE TABLE sqlite_db.comments AS
SELECT
  watchlist_id, ticker, box_index, text,
  CAST(updated_at AS TEXT) AS updated_at
FROM comments;

-- === Indexes (helpful for your app) ===
CREATE INDEX IF NOT EXISTS idx_sqlite_stock_data_t_d
  ON sqlite_db.stock_data(ticker, date);
CREATE INDEX IF NOT EXISTS idx_sqlite_metrics_snap_t
  ON sqlite_db.metrics_snapshot(ticker);
CREATE INDEX IF NOT EXISTS idx_sqlite_items_wl
  ON sqlite_db.watchlist_items(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_sqlite_items_t
  ON sqlite_db.watchlist_items(ticker);

DETACH DATABASE sqlite_db;
SQL

echo "✅ Converted to SQLite: data/stocks.sqlite"
