# update_breadth_db.py
import sqlite3
from collections import deque, defaultdict
from typing import Dict, List, Tuple
import os

try:
    from tqdm import tqdm
    TQDM_AVAILABLE = True
except:
    TQDM_AVAILABLE = False
    

from utils import (
    STOCKS_LISTS_DB,
    get_all_sectors,
    get_all_lists,
    build_ticker_memberships,
)

STOCKS_PRICES_DB = "../data/stocks.db"
BREADTH_DB = "../data/breadth.db"

# 52 weeks ~ 252 trading days
WINDOW_52W = 252
MA_WINDOWS = [5, 10, 20, 50, 200]


# ---------------------------------------------------------------------
# 1) DB setup: same schema as before, but WITHOUT deleting the DB
# ---------------------------------------------------------------------
def ensure_breadth_db(db_path: str = BREADTH_DB) -> None:
    """
    Ensure breadth.db exists and has the correct schema. 
    Does NOT delete or recreate the DB.
    """
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()

        # groups table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS groups (
                id   INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,         -- 'sector' or 'list'
                name TEXT NOT NULL,
                UNIQUE(type, name)
            )
            """
        )

        # breadth table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS breadth (
                group_id       INTEGER NOT NULL,
                date           TEXT    NOT NULL,
                total          INTEGER NOT NULL,
                adv            INTEGER NOT NULL,
                dec            INTEGER NOT NULL,
                new_high_52w   INTEGER NOT NULL,
                new_low_52w    INTEGER NOT NULL,
                above_ma5      INTEGER NOT NULL,
                above_ma10     INTEGER NOT NULL,
                above_ma20     INTEGER NOT NULL,
                above_ma50     INTEGER NOT NULL,
                above_ma200    INTEGER NOT NULL,
                spike_up       INTEGER NOT NULL,
                spike_down     INTEGER NOT NULL,
                ad_value       INTEGER NOT NULL,
                ema19          REAL,
                ema39          REAL,
                mcclellan      REAL,
                PRIMARY KEY (group_id, date),
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
            )
            """
        )

        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------
# 2) Same helpers as your original script
# ---------------------------------------------------------------------
def insert_groups(
    sectors: List[str], lists_: List[str], db_path: str = BREADTH_DB
) -> Dict[Tuple[str, str], int]:
    """
    Ensure all sectors and lists exist in groups table.
    Return mapping: (type, name) -> group_id.
    """
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        mapping: Dict[Tuple[str, str], int] = {}

        def get_or_create(t: str, name: str) -> int:
            cur.execute(
                "INSERT OR IGNORE INTO groups(type, name) VALUES (?, ?)",
                (t, name),
            )
            cur.execute(
                "SELECT id FROM groups WHERE type = ? AND name = ?",
                (t, name),
            )
            row = cur.fetchone()
            assert row is not None
            return row[0]

        for sector in sectors:
            gid = get_or_create("sector", sector)
            mapping[("sector", sector)] = gid

        for name in lists_:
            gid = get_or_create("list", name)
            mapping[("list", name)] = gid

        conn.commit()
        return mapping
    finally:
        conn.close()


def default_stats() -> Dict[str, int]:
    return {
        "total": 0,
        "adv": 0,
        "dec": 0,
        "new_high_52w": 0,
        "new_low_52w": 0,
        "above_ma5": 0,
        "above_ma10": 0,
        "above_ma20": 0,
        "above_ma50": 0,
        "above_ma200": 0,
        "spike_up": 0,
        "spike_down": 0,
    }


def process_prices(
    group_id_map: Dict[Tuple[str, str], int],
    ticker_to_sector: Dict[str, str],
    ticker_to_lists: Dict[str, List[str]],
) -> Dict[int, Dict[str, Dict[str, int]]]:
    """
    Build aggregated stats per group_id per date from stocks.prices.
    This computes full history, but we will only INSERT the dates that
    are not already present in breadth.db in the incremental step.
    """
    conn = sqlite3.connect(STOCKS_PRICES_DB)
    try:
        cur = conn.cursor()

        cur.execute("SELECT DISTINCT symbol FROM prices ORDER BY symbol")
        symbols = [row[0] for row in cur.fetchall()]

        group_stats: Dict[int, Dict[str, Dict[str, int]]] = defaultdict(
            lambda: defaultdict(default_stats)
        )

        iterator = tqdm(symbols, desc="Processing symbols") if TQDM_AVAILABLE else symbols

        for symbol in iterator:
            sector = ticker_to_sector.get(symbol)
            lists_for_symbol = ticker_to_lists.get(symbol, [])

            if sector is None and not lists_for_symbol:
                continue

            group_ids = []
            if sector is not None and ("sector", sector) in group_id_map:
                group_ids.append(group_id_map[("sector", sector)])
            for list_name in lists_for_symbol:
                key = ("list", list_name)
                if key in group_id_map:
                    group_ids.append(group_id_map[key])

            if not group_ids:
                continue

            cur.execute(
                """
                SELECT date, open, high, low, close, volume
                FROM prices
                WHERE symbol = ?
                ORDER BY date
                """,
                (symbol,),
            )
            rows = cur.fetchall()
            if not rows:
                continue

            prev_close = None
            window_52w = deque(maxlen=WINDOW_52W - 1)

            ma_windows: Dict[int, Tuple[deque, float]] = {}
            for w in MA_WINDOWS:
                ma_windows[w] = (deque(maxlen=w), 0.0)

            vol_window = deque(maxlen=20)  # previous 20 days

            for date, o, h, l, c, v in rows:
                close = float(c)
                high = float(h)
                low = float(l)
                vol = float(v)

                # --- advance / decline ---
                is_adv = False
                is_dec = False
                pct_change = None
                if prev_close is not None:
                    pct_change = (close - prev_close) / prev_close
                    is_adv = close > prev_close
                    is_dec = close < prev_close

                # --- 52-week highs/lows on previous 251 closes ---
                is_new_high_52w = False
                is_new_low_52w = False
                if len(window_52w) >= WINDOW_52W - 1:
                    max_prev = max(window_52w)
                    min_prev = min(window_52w)
                    is_new_high_52w = close > max_prev
                    is_new_low_52w = close < min_prev

                window_52w.append(close)

                # --- moving averages ---
                above_ma_flags = {w: False for w in MA_WINDOWS}
                for w in MA_WINDOWS:
                    dq, s = ma_windows[w]
                    oldest = dq[0] if len(dq) == dq.maxlen else None

                    dq.append(close)
                    s += close
                    if oldest is not None:
                        s -= oldest
                    ma_windows[w] = (dq, s)

                    if len(dq) == w:
                        ma = s / w
                        if close > ma:
                            above_ma_flags[w] = True

                # --- volume breakout vs previous 20 days ---
                avg_vol_20 = None
                if len(vol_window) == vol_window.maxlen:
                    avg_vol_20 = sum(vol_window) / len(vol_window)

                vol_window.append(vol)

                # --- close position in daily range ---
                in_top_50 = False
                in_bottom_50 = False
                if high > low:
                    mid = (high + low) / 2.0
                    in_top_50 = close >= mid
                    in_bottom_50 = close <= mid

                # --- spike up / down ---
                is_spike_up = False
                is_spike_down = False
                if (
                    pct_change is not None
                    and avg_vol_20 is not None
                    and high > low
                ):
                    if (
                        pct_change >= 0.015
                        and vol >= 1.25 * avg_vol_20
                        and in_top_50
                    ):
                        is_spike_up = True

                    if (
                        pct_change <= -0.015
                        and vol >= 1.25 * avg_vol_20
                        and in_bottom_50
                    ):
                        is_spike_down = True

                # --- aggregate to all groups for this symbol ---
                for gid in group_ids:
                    st = group_stats[gid][date]

                    st["total"] += 1
                    if is_adv:
                        st["adv"] += 1
                    if is_dec:
                        st["dec"] += 1
                    if is_new_high_52w:
                        st["new_high_52w"] += 1
                    if is_new_low_52w:
                        st["new_low_52w"] += 1

                    if above_ma_flags[5]:
                        st["above_ma5"] += 1
                    if above_ma_flags[10]:
                        st["above_ma10"] += 1
                    if above_ma_flags[20]:
                        st["above_ma20"] += 1
                    if above_ma_flags[50]:
                        st["above_ma50"] += 1
                    if above_ma_flags[200]:
                        st["above_ma200"] += 1

                    if is_spike_up:
                        st["spike_up"] += 1
                    if is_spike_down:
                        st["spike_down"] += 1

                prev_close = close

        return group_stats
    finally:
        conn.close()


# ---------------------------------------------------------------------
# 3) Incremental McClellan + insert
# ---------------------------------------------------------------------
def compute_mcclellan_and_insert_incremental(
    group_stats: Dict[int, Dict[str, Dict[str, int]]],
    db_path: str = BREADTH_DB,
) -> None:
    """
    For each group:
      - Look up the last date in breadth for that group (if any),
        along with the last ema19 and ema39.
      - Only insert rows for dates > last_date.
      - Continue EMA19/EMA39 from the last saved values so that 
        McClellan is continuous.
    """
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()

        alpha19 = 2.0 / (19.0 + 1.0)
        alpha39 = 2.0 / (39.0 + 1.0)

        items = list(group_stats.items())
        iterator = tqdm(items, desc="Updating McClellan") if TQDM_AVAILABLE else items

        for gid, date_dict in iterator:
            # get last stored date + EMA for this group
            cur.execute(
                """
                SELECT date, ema19, ema39
                FROM breadth
                WHERE group_id = ?
                ORDER BY date DESC
                LIMIT 1
                """,
                (gid,),
            )
            row = cur.fetchone()
            if row:
                last_date, ema19, ema39 = row
            else:
                last_date, ema19, ema39 = None, None, None

            # keep only dates > last_date (or all if no last_date)
            if last_date is None:
                dates = sorted(date_dict.keys())
            else:
                dates = sorted(d for d in date_dict.keys() if d > last_date)

            if not dates:
                continue  # nothing new for this group

            for d in dates:
                st = date_dict[d]
                total = st["total"]
                adv = st["adv"]
                dec = st["dec"]
                ad_value = adv - dec

                # If no EMA yet (fresh group or old rows without EMAs),
                # start EMAs at current ad_value.
                if ema19 is None:
                    ema19 = float(ad_value)
                else:
                    ema19 = ema19 + alpha19 * (ad_value - ema19)

                if ema39 is None:
                    ema39 = float(ad_value)
                else:
                    ema39 = ema39 + alpha39 * (ad_value - ema39)

                mcclellan = ema19 - ema39

                cur.execute(
                    """
                    INSERT OR REPLACE INTO breadth (
                        group_id, date,
                        total,
                        adv, dec,
                        new_high_52w, new_low_52w,
                        above_ma5, above_ma10, above_ma20, above_ma50, above_ma200,
                        spike_up, spike_down,
                        ad_value, ema19, ema39, mcclellan
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        gid,
                        d,
                        total,
                        adv,
                        dec,
                        st["new_high_52w"],
                        st["new_low_52w"],
                        st["above_ma5"],
                        st["above_ma10"],
                        st["above_ma20"],
                        st["above_ma50"],
                        st["above_ma200"],
                        st["spike_up"],
                        st["spike_down"],
                        ad_value,
                        ema19,
                        ema39,
                        mcclellan,
                    ),
                )

        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------
# 4) Main entry point
# ---------------------------------------------------------------------
def main():
    # 1. Ensure breadth DB + tables exist (no deletion)
    ensure_breadth_db()

    # 2. Get sectors & lists from stocks_lists.db
    sectors = get_all_sectors(STOCKS_LISTS_DB)
    lists_ = get_all_lists(STOCKS_LISTS_DB)

    # 3. Ensure groups exist, get mapping
    group_id_map = insert_groups(sectors, lists_)

    # 4. Build ticker -> sector / lists membership
    ticker_to_sector, ticker_to_lists = build_ticker_memberships(STOCKS_LISTS_DB)

    # 5. Process prices & aggregate per group/date (full history)
    group_stats = process_prices(group_id_map, ticker_to_sector, ticker_to_lists)

    # 6. Incrementally compute McClellan and insert only missing dates
    compute_mcclellan_and_insert_incremental(group_stats)

    print("Breadth database updated in", BREADTH_DB)


if __name__ == "__main__":
    main()
