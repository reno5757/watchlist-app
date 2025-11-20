#!/usr/bin/env python3
# Build metrics for the latest available date in the prices database, per symbol.

import sqlite3
from pathlib import Path


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


def max_drawdown(prices):
    """
    Compute maximum drawdown over a sequence of prices.
    Returns a positive number (e.g. 0.25 for -25% max drawdown).
    If there is no drawdown, returns 0.0.
    """
    if not prices:
        return None

    peak = prices[0]
    max_dd = 0.0  # positive fraction

    for p in prices:
        if p > peak:
            peak = p
        if peak > 0:
            dd = (p / peak) - 1.0  # negative when below peak
            if dd < 0:
                max_dd = max(max_dd, -dd)  # store positive magnitude

    return max_dd


def compute_percentile_ranks(symbol_to_value):
    """
    Given {symbol: value}, where higher is better and some values may be None,
    return {symbol: percentile_rank}, with:
        0   = worst
        100 = best
    Symbols with None values get percentile_rank=None.
    """
    items = [(sym, val) for sym, val in symbol_to_value.items() if val is not None]

    ranks = {sym: None for sym in symbol_to_value.keys()}
    n = len(items)
    if n == 0:
        return ranks
    if n == 1:
        sym, _ = items[0]
        ranks[sym] = 100.0
        return ranks

    # Sort by value ascending: worst first, best last
    items.sort(key=lambda x: x[1])

    # Assign percentile: 0 = worst, 100 = best
    for idx, (sym, _) in enumerate(items):
        percentile = 100.0 * idx / (n - 1)
        ranks[sym] = percentile

    return ranks


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

    # Timeframes in trading days for Absolute Strength & Sortino-AS
    TIMEFRAMES = {
        "1w": 5,    # NEW: 1 week
        "1m": 21,
        "3m": 63,
        "6m": 126,
        "12m": 252,
    }

    try:
        # Fresh metrics table (no schema upgrade logic)
        metrics_cur.execute("DROP TABLE IF EXISTS metrics;")
        metrics_cur.execute(
            """
            CREATE TABLE metrics (
                symbol                      TEXT NOT NULL,
                date                        TEXT NOT NULL,  -- YYYY-MM-DD

                -- Basic returns
                daily_return                REAL,
                return_5d                   REAL,
                return_21d                  REAL,
                return_63d                  REAL,
                return_ytd                  REAL,

                -- Moving average slopes (-1 = down, 0 = flat, 1 = up)
                ma10_slope                  INTEGER,
                ma20_slope                  INTEGER,
                ma50_slope                  INTEGER,
                ma200_slope                 INTEGER,

                -- 52-week distances
                dist_52w_high               REAL,           -- (close / 52w_high) - 1
                dist_52w_low                REAL,           -- (close / 52w_low)  - 1

                -- Max drawdown per timeframe (positive fraction, e.g. 0.25 for -25%)
                mdd_1w                      REAL,
                mdd_1m                      REAL,
                mdd_3m                      REAL,
                mdd_6m                      REAL,
                mdd_12m                     REAL,

                -- Absolute Strength percentile ranks (0 = worst, 100 = best)
                as_1w_prank                 REAL,
                as_1m_prank                 REAL,
                as_3m_prank                 REAL,
                as_6m_prank                 REAL,
                as_12m_prank                REAL,

                -- Sortino-AS percentile ranks (perf / max_drawdown)
                -- 0 = worst, 100 = best
                sortino_as_1w_prank         REAL,
                sortino_as_1m_prank         REAL,
                sortino_as_3m_prank         REAL,
                sortino_as_6m_prank         REAL,
                sortino_as_12m_prank        REAL,

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

        latest_year = parse_year(latest_date)

        metrics_by_symbol = {}

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

            try:
                latest_idx = dates.index(latest_date)
            except ValueError:
                continue

            close_latest = closes[latest_idx]

            # --- Returns ---

            daily_return = None
            if latest_idx >= 1:
                prev_close = closes[latest_idx - 1]
                if prev_close != 0:
                    daily_return = (close_latest / prev_close) - 1

            return_5d = None
            if latest_idx >= 5:
                close_5d_ago = closes[latest_idx - 5]
                if close_5d_ago != 0:
                    return_5d = (close_latest / close_5d_ago) - 1

            return_21d = None
            if latest_idx >= 21:
                close_21d_ago = closes[latest_idx - 21]
                if close_21d_ago != 0:
                    return_21d = (close_latest / close_21d_ago) - 1

            return_63d = None
            if latest_idx >= 63:
                close_63d_ago = closes[latest_idx - 63]
                if close_63d_ago != 0:
                    return_63d = (close_latest / close_63d_ago) - 1

            return_ytd = None
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

            ma10_today = compute_ma(closes, 10, latest_idx)
            ma20_today = compute_ma(closes, 20, latest_idx)
            ma50_today = compute_ma(closes, 50, latest_idx)
            ma200_today = compute_ma(closes, 200, latest_idx)

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

            # --- Absolute Strength & Sortino-AS raw values, + MDD per timeframe ---

            abs_returns = {tf: None for tf in TIMEFRAMES.keys()}
            sortino_vals = {tf: None for tf in TIMEFRAMES.keys()}
            mdds = {tf: None for tf in TIMEFRAMES.keys()}

            for tf_label, tf_days in TIMEFRAMES.items():
                if latest_idx >= tf_days:
                    start_idx = latest_idx - tf_days
                    window_prices = closes[start_idx : latest_idx + 1]

                    mdd_tf = max_drawdown(window_prices)
                    mdds[tf_label] = mdd_tf

                    start_price = closes[start_idx]
                    if start_price != 0:
                        ret_tf = (close_latest / start_price) - 1.0
                    else:
                        ret_tf = None

                    abs_returns[tf_label] = ret_tf

                    if ret_tf is not None and mdd_tf is not None and mdd_tf > 0:
                        sortino_tf = ret_tf / mdd_tf
                    else:
                        sortino_tf = None

                    sortino_vals[tf_label] = sortino_tf
                else:
                    mdds[tf_label] = None
                    abs_returns[tf_label] = None
                    sortino_vals[tf_label] = None

            metrics_by_symbol[symbol] = {
                "symbol": symbol,
                "date": latest_date,
                "daily_return": daily_return,
                "return_5d": return_5d,
                "return_21d": return_21d,
                "return_63d": return_63d,
                "return_ytd": return_ytd,
                "ma10_slope": ma10_slope,
                "ma20_slope": ma20_slope,
                "ma50_slope": ma50_slope,
                "ma200_slope": ma200_slope,
                "dist_52w_high": dist_52w_high,
                "dist_52w_low": dist_52w_low,
                "abs_returns": abs_returns,
                "sortino_vals": sortino_vals,
                "mdds": mdds,
                "as_1w_prank": None,
                "as_1m_prank": None,
                "as_3m_prank": None,
                "as_6m_prank": None,
                "as_12m_prank": None,
                "sortino_as_1w_prank": None,
                "sortino_as_1m_prank": None,
                "sortino_as_3m_prank": None,
                "sortino_as_6m_prank": None,
                "sortino_as_12m_prank": None,
            }

            if idx == 1 or idx == total_symbols or idx % 100 == 0:
                percent = idx / total_symbols * 100
                print(
                    f"[INFO] Progress: {idx} / {total_symbols} ({percent:.1f}%)",
                    end="\r",
                    flush=True,
                )

        print()  # newline after progress

        # --- Cross-sectional percentile ranks for Absolute Strength and Sortino-AS ---

        for tf_label in TIMEFRAMES.keys():
            abs_map = {
                sym: data["abs_returns"][tf_label]
                for sym, data in metrics_by_symbol.items()
            }
            abs_pranks = compute_percentile_ranks(abs_map)

            sortino_map = {
                sym: data["sortino_vals"][tf_label]
                for sym, data in metrics_by_symbol.items()
            }
            sortino_pranks = compute_percentile_ranks(sortino_map)

            if tf_label == "1w":
                as_field = "as_1w_prank"
                sortino_field = "sortino_as_1w_prank"
            elif tf_label == "1m":
                as_field = "as_1m_prank"
                sortino_field = "sortino_as_1m_prank"
            elif tf_label == "3m":
                as_field = "as_3m_prank"
                sortino_field = "sortino_as_3m_prank"
            elif tf_label == "6m":
                as_field = "as_6m_prank"
                sortino_field = "sortino_as_6m_prank"
            elif tf_label == "12m":
                as_field = "as_12m_prank"
                sortino_field = "sortino_as_12m_prank"
            else:
                continue

            for sym, data in metrics_by_symbol.items():
                data[as_field] = abs_pranks.get(sym)
                data[sortino_field] = sortino_pranks.get(sym)

        # --- Insert into metrics table ---

        metrics_conn.execute("BEGIN;")

        for data in metrics_by_symbol.values():
            mdds = data["mdds"]
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
                    dist_52w_low,
                    mdd_1w,
                    mdd_1m,
                    mdd_3m,
                    mdd_6m,
                    mdd_12m,
                    as_1w_prank,
                    as_1m_prank,
                    as_3m_prank,
                    as_6m_prank,
                    as_12m_prank,
                    sortino_as_1w_prank,
                    sortino_as_1m_prank,
                    sortino_as_3m_prank,
                    sortino_as_6m_prank,
                    sortino_as_12m_prank
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    data["symbol"],
                    data["date"],
                    data["daily_return"],
                    data["return_5d"],
                    data["return_21d"],
                    data["return_63d"],
                    data["return_ytd"],
                    data["ma10_slope"],
                    data["ma20_slope"],
                    data["ma50_slope"],
                    data["ma200_slope"],
                    data["dist_52w_high"],
                    data["dist_52w_low"],
                    mdds["1w"],
                    mdds["1m"],
                    mdds["3m"],
                    mdds["6m"],
                    mdds["12m"],
                    data["as_1w_prank"],
                    data["as_1m_prank"],
                    data["as_3m_prank"],
                    data["as_6m_prank"],
                    data["as_12m_prank"],
                    data["sortino_as_1w_prank"],
                    data["sortino_as_1m_prank"],
                    data["sortino_as_3m_prank"],
                    data["sortino_as_6m_prank"],
                    data["sortino_as_12m_prank"],
                ),
            )

        metrics_conn.commit()
        print(f"[INFO] Done. Metrics rows for {latest_date}: {len(metrics_by_symbol)}")

    finally:
        prices_conn.close()
        metrics_conn.close()


if __name__ == "__main__":
    main()
