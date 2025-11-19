import os
import sqlite3
import shutil
import time
from datetime import datetime, date, timedelta
from dotenv import load_dotenv

from polygon import RESTClient


# ==== CONFIG ====
DB_PATH = "../data/stocks.db"  # path to your SQLite database
load_dotenv()
API_KEY = os.environ.get("POLYGON_API_KEY")
if not API_KEY:
    raise SystemExit("POLYGON_API_KEY not set. Please create a .env file with POLYGON_API_KEY=your_key_here")

SLEEP_SECONDS = 12      # to respect Polygon rate limits


def backup_db(db_path: str) -> str:
    """Create a timestamped backup of the DB and return the backup path."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{os.path.splitext(db_path)[0]}_backup_{timestamp}.db"
    shutil.copy2(db_path, backup_path)
    print(f"Backup created: {backup_path}")
    return backup_path


def get_last_date(conn: sqlite3.Connection) -> date:
    """Return the last available date in prices as a date object."""
    cur = conn.cursor()
    cur.execute("SELECT MAX(date) FROM prices")
    row = cur.fetchone()
    if not row or row[0] is None:
        raise RuntimeError("prices table is empty or missing; cannot determine last date.")
    return datetime.strptime(row[0], "%Y-%m-%d").date()


def generate_weekdays(start: date, end: date):
    """Yield all weekdays between start and end inclusive."""
    current = start
    while current <= end:
        if current.weekday() < 5:  # Monday=0 ... Friday=4
            yield current
        current += timedelta(days=1)


def main():
    if API_KEY in ("YOUR_POLYGON_API_KEY", "", None):
        raise SystemExit("Please set your Polygon API key (API_KEY variable or POLYGON_API_KEY env var).")

    if not os.path.exists(DB_PATH):
        raise SystemExit(f"Database file not found: {DB_PATH}")

    # 1) Backup DB
    backup_db(DB_PATH)

    # 2) Connect to DB and get last date
    conn = sqlite3.connect(DB_PATH)
    try:
        last_date = get_last_date(conn)
        print(f"Last date in DB: {last_date}")

        # 3) Compute start and end dates
        start_date = last_date + timedelta(days=1)
        today = date.today()
        end_date = today - timedelta(days=1)  # yesterday

        if start_date > end_date:
            print("Database is already up to date. No new days to fetch.")
            return

        print(f"Fetching data from {start_date} to {end_date} (weekdays only).")

        client = RESTClient(API_KEY)

        # 4) Loop over each weekday and fetch grouped daily aggs
        inserted_total = 0
        for d in generate_weekdays(start_date, end_date):
            date_str = d.strftime("%Y-%m-%d")
            print(f"\nFetching grouped daily data for {date_str}...")

            try:
                grouped = client.get_grouped_daily_aggs(date_str, adjusted=True)

                rows = []
                for agg in grouped:
                    rows.append(
                        (
                            agg.ticker,           # symbol
                            date_str,             # date
                            float(agg.open),      # open
                            float(agg.high),      # high
                            float(agg.low),       # low
                            float(agg.close),     # close
                            int(agg.volume),      # volume
                        )
                    )

                if not rows:
                    print(f"No data returned for {date_str}.")
                else:
                    # Insert rows; open_interest defaults to 0 from schema
                    conn.executemany(
                        """
                        INSERT OR IGNORE INTO prices
                            (symbol, date, open, high, low, close, volume)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                        rows,
                    )
                    conn.commit()
                    print(f"Inserted {len(rows)} rows for {date_str}.")
                    inserted_total += len(rows)

                print(f"Sleeping {SLEEP_SECONDS}s to respect rate limits...")
                time.sleep(SLEEP_SECONDS)

            except Exception as e:
                # Log error and continue with next day
                print(f"Error on {date_str}: {e}")
                # Optional: you might want a shorter sleep after errors
                time.sleep(2)
                continue

        print(f"\nDone. Total new rows inserted: {inserted_total}")

    finally:
        conn.close()
        print("Database connection closed.")


if __name__ == "__main__":
    main()
