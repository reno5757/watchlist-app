#!/usr/bin/env python3
# Build metrics for the latest available date in the prices database, per symbol.

import sqlite3
from pathlib import Path
from datetime import datetime


def parse_year(date_str: str) -> int:
    # date_str is 'YYYY-MM-DD'
    return int(date_str[:4])


def compute_ma(values, window, upto_index):
    """
    Compute moving average up to and including upto_index (0-based).
    We mimic the SQL window:
      ROWS BETWEEN (window-1) PRECEDING AND CURRENT ROW
    which becomes an expanding window near the start.
    """
    if upto_index < 0:
        return None
    start = max(0, upto_index - (window - 1))
    slice_vals = values[start : upto_index + 1]
    if not slice_vals:
        return None
    return sum(slice_vals) / len(slice_vals)


def main() -> None:
    # Locate project root and data directory based on this file's path
    script_path = Path(__file__).resolve()
    project_root = script_path.parents[1]  # go up from etl/ to project root
    data_dir = project_root / "data"

    prices_db_path = data_dir / "stocks.db"
    metrics_db_path = data_dir / "metrics.db"

    if not prices_db_path.exists():
        raise FileNotFoundError(f"stocks.db not found at {prices_db_path}")

    # Connect separately to prices and metrics
    prices_conn = sqlite3.connect(prices_db_path)
    prices_cur = prices_conn.cursor()

    metrics_conn = sqlite3.connect(metrics_db_path)
    metrics_cur = metrics_conn.cursor()

    try:
        # Create metrics table fresh (no schema upgrade logic)
        metrics_cur.execute(
            """
            CREATE TABLE IF NOT EXISTS metrics (
                symbol        TEXT NOT NULL,
                date          TEXT NOT NULL,  -- YYYY-MM-DD
                daily_return  REAL,
                return_5d     REAL,
                return_21d    REAL,
                return_63d    REAL,
                return_ytd    REAL,
                ma10_slope    INTEGER,        -- -1 = down, 0 = flat, 1 = up
                ma20_slope    INTEGER,
                ma50_slope    INTEGER,
                ma200_slope   INTEGER,
                dist_52w_high REAL,           -- (close / 52w_high) - 1
                dist_52w_low  REAL,           -- (close / 52w_low)  - 1
                PRIMARY KEY (symbol, date)
            );
            """
        )
        metrics_conn.commit()

        # Get latest date
        prices_cur.execute("SELECT MAX(date) FROM prices;")
        latest_date_row = prices_cur.fetchone()
        latest_date = latest_date_row[0]
        if latest_date is None:
            print("No data in prices, nothing to do.")
            return

        # Get distinct symbols that have data on that date
        prices_cur.execute(
            "SELECT DISTINCT symbol FROM prices WHERE date = ? ORDER BY symbol;",
            (latest_date,),
        )
        symbols = [row[0] for row in prices_cur.fetchall()]
        total_symbols = len(symbols)

        print(f"[INFO] Latest date in prices: {latest_date}")
        print(f"[INFO] Symbols on that date: {total_symbols}")
        print("[INFO] Computing metrics symbol by symbol...")

        # Begin one transaction for all inserts
        metrics_conn.execute("BEGIN;")

        latest_year = parse_year(latest_date)

        for idx, symbol in enumerate(symbols, start=1):
            # Fetch full history up to latest_date for this symbol
            prices_cur.execute(
                """
                SELECT date, close
                FROM prices
                WHERE symbol = ? AND date <= ?
                ORDER BY date;
                """,
                (symbol, latest_date),
            )
            rows = prices_cur.fetchall()
            if not rows:
                continue

            dates = [r[0] for r in rows]
            closes = [float(r[1]) for r in rows]
            n = len(closes)

            # Index of latest date entry for this symbol
            # (should be the last one, but we don't assume)
            try:
                latest_idx = dates.index(latest_date)
            except ValueError:
                # No point if symbol has no row on latest_date (shouldn't happen)
                continue

            close_latest = closes[latest_idx]

            # --- Returns ---

            # Daily return: 1 day ago
            daily_return = None
            if latest_idx >= 1:
                prev_close = closes[latest_idx - 1]
                if prev_close != 0:
                    daily_return = (close_latest / prev_close) - 1

            # 5-day return (lag 5)
            return_5d = None
            if latest_idx >= 5:
                close_5d_ago = closes[latest_idx - 5]
                if close_5d_ago != 0:
                    return_5d = (close_latest / close_5d_ago) - 1

            # 21-day return
            return_21d = None
            if latest_idx >= 21:
                close_21d_ago = closes[latest_idx - 21]
                if close_21d_ago != 0:
                    return_21d = (close_latest / close_21d_ago) - 1

            # 63-day return
            return_63d = None
            if latest_idx >= 63:
                close_63d_ago = closes[latest_idx - 63]
                if close_63d_ago != 0:
                    return_63d = (close_latest / close_63d_ago) - 1

            # YTD: from first close of the latest year
            return_ytd = None
            # find first index in the same year as latest_date
            first_ytd_idx = None
            for i, d in enumerate(dates):
                if parse_year(d) == latest_year:
                    first_ytd_idx = i
                    break
            if first_ytd_idx is not None:
                ytd_start_close = closes[first_ytd_idx]
                if ytd_start_close != 0:
                    return_ytd = (close_latest / ytd_start_close) - 1

            # --- Moving averages and slopes ---

            # Today's MAs
            ma10_today = compute_ma(closes, 10, latest_idx)
            ma20_today = compute_ma(closes, 20, latest_idx)
            ma50_today = compute_ma(closes, 50, latest_idx)
            ma200_today = compute_ma(closes, 200, latest_idx)

            # Yesterday's MAs (for slope)
            ma10_prev = compute_ma(closes, 10, latest_idx - 1) if latest_idx >= 1 else None
            ma20_prev = compute_ma(closes, 20, latest_idx - 1) if latest_idx >= 1 else None
            ma50_prev = compute_ma(closes, 50, latest_idx - 1) if latest_idx >= 1 else None
            ma200_prev = compute_ma(closes, 200, latest_idx - 1) if latest_idx >= 1 else None

            def slope(ma_prev, ma_today):
                if ma_prev is None or ma_today is None:
                    return None
                if ma_today > ma_prev:
                    return 1
                if ma_today < ma_prev:
                    return -1
                return 0

            ma10_slope = slope(ma10_prev, ma10_today)
            ma20_slope = slope(ma20_prev, ma20_today)
            ma50_slope = slope(ma50_prev, ma50_today)
            ma200_slope = slope(ma200_prev, ma200_today)

            # --- 52-week high/low over last 252 trading days ---

            window_52w_start = max(0, n - 252)
            closes_52w = closes[window_52w_start : n]

            dist_52w_high = None
            dist_52w_low = None

            if closes_52w:
                high_52w = max(closes_52w)
                low_52w = min(closes_52w)

                if high_52w != 0:
                    dist_52w_high = (close_latest / high_52w) - 1
                if low_52w != 0:
                    dist_52w_low = (close_latest / low_52w) - 1

            # --- Insert into metrics (INSERT OR REPLACE) ---

            metrics_cur.execute(
                """
                INSERT OR REPLACE INTO metrics (
                    symbol,
                    date,
                    daily_return,
                    return_5d,
                    return_21d,
                    return_63d,
                    return_ytd,
                    ma10_slope,
                    ma20_slope,
                    ma50_slope,
                    ma200_slope,
                    dist_52w_high,
                    dist_52w_low
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    symbol,
                    latest_date,
                    daily_return,
                    return_5d,
                    return_21d,
                    return_63d,
                    return_ytd,
                    ma10_slope,
                    ma20_slope,
                    ma50_slope,
                    ma200_slope,
                    dist_52w_high,
                    dist_52w_low,
                ),
            )

            # --- Simple progress output ---
            if idx == 1 or idx == total_symbols or idx % 100 == 0:
                percent = idx / total_symbols * 100
                print(
                    f"[INFO] Progress: {idx} / {total_symbols} ({percent:.1f}%)",
                    end="\r",
                    flush=True,
                )

        # Commit all inserts
        metrics_conn.commit()
        print()  # newline after progress
        print(f"[INFO] Done. Metrics rows for {latest_date}: {total_symbols}")

    finally:
        prices_conn.close()
        metrics_conn.close()


if __name__ == "__main__":
    main()
