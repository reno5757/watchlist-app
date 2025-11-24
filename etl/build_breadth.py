# build_breadth_db.py
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


def create_breadth_db(db_path: str = BREADTH_DB) -> None:
    
    #Delete existing db
    if os.path.exists(db_path):
        os.remove(db_path)
    
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()

        cur.execute(
        """
        CREATE TABLE IF NOT EXISTS groups (
            id   INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,         -- 'sector' or 'list'
            name TEXT NOT NULL,
            UNIQUE(type, name)          -- <--- add this
        )
        """
    )


        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS breadth (
                group_id       INTEGER NOT NULL,
                date           TEXT    NOT NULL,
                total          INTEGER NOT NULL,  -- total number of stocks considered that day
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

        # helper to upsert + get id
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
        "spike_up": 0,      # new
        "spike_down": 0,    # new
    }


def process_prices(
    group_id_map: Dict[Tuple[str, str], int],
    ticker_to_sector: Dict[str, str],
    ticker_to_lists: Dict[str, List[str]],
) -> Dict[int, Dict[str, Dict[str, int]]]:

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

            # volume window: previous 20 days (exclude current)
            vol_window = deque(maxlen=20)

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

                # --- 52-week high/low using previous 251 closes ---
                is_new_high_52w = False
                is_new_low_52w = False
                if len(window_52w) >= WINDOW_52W - 1:
                    max_prev = max(window_52w)
                    min_prev = min(window_52w)
                    is_new_high_52w = close > max_prev
                    is_new_low_52w = close < min_prev

                window_52w.append(close)

                # --- moving averages on close ---
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

                # add today to volume window only AFTER using previous 20 days
                vol_window.append(vol)

                # --- close position in daily range ---
                in_top_50 = False
                in_bottom_50 = False
                if high > low:
                    mid = (high + low) / 2.0
                    in_top_50 = close >= mid
                    in_bottom_50 = close <= mid

                # --- spike up / spike down conditions ---
                is_spike_up = False
                is_spike_down = False

                if (
                    pct_change is not None
                    and avg_vol_20 is not None
                    and high > low
                ):
                    # +1.5% and 25% above 20d average volume
                    if (
                        pct_change >= 0.015
                        and vol >= 1.25 * avg_vol_20
                        and in_top_50
                    ):
                        is_spike_up = True

                    # -1.5% and 25% above 20d average volume
                    if (
                        pct_change <= -0.015
                        and vol >= 1.25 * avg_vol_20
                        and in_bottom_50
                    ):
                        is_spike_down = True

                # --- aggregate into all groups this symbol belongs to ---
                for gid in group_ids:
                    st = group_stats[gid][date]

                    # count this stock in total for that group/date
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


def compute_mcclellan_and_insert(
    group_stats: Dict[int, Dict[str, Dict[str, int]]],
    db_path: str = BREADTH_DB,
) -> None:

    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()

        alpha19 = 2.0 / (19.0 + 1.0)
        alpha39 = 2.0 / (39.0 + 1.0)

        items = list(group_stats.items())
        iterator = tqdm(items, desc="Computing McClellan") if TQDM_AVAILABLE else items

        for gid, date_dict in iterator:
            dates = sorted(date_dict.keys())
            ema19 = None
            ema39 = None

            for d in dates:
                st = date_dict[d]
                total = st["total"]
                adv = st["adv"]
                dec = st["dec"]
                ad_value = adv - dec

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


def main():
    # 1. Prepare breadth DB
    create_breadth_db()

    # 2. Get sectors & lists from stocks_lists.db
    sectors = get_all_sectors(STOCKS_LISTS_DB)
    lists_ = get_all_lists(STOCKS_LISTS_DB)

    # 3. Insert groups, get mapping
    group_id_map = insert_groups(sectors, lists_)

    # 4. Build ticker -> sector / lists membership
    ticker_to_sector, ticker_to_lists = build_ticker_memberships(STOCKS_LISTS_DB)

    # 5. Process prices & aggregate per group/date
    group_stats = process_prices(group_id_map, ticker_to_sector, ticker_to_lists)

    # 6. Compute McClellan oscillator and persist results
    compute_mcclellan_and_insert(group_stats)

    print("Breadth database built in", BREADTH_DB)


if __name__ == "__main__":
    main()
