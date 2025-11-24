# stock_helpers.py
import sqlite3
from typing import List, Dict, Tuple, DefaultDict
from collections import defaultdict

STOCKS_LISTS_DB = "../data/stocks_lists.db"


def get_connection(db_path: str = STOCKS_LISTS_DB) -> sqlite3.Connection:
    return sqlite3.connect(db_path)


def get_stocks_by_sector(sector: str, db_path: str = STOCKS_LISTS_DB) -> List[str]:
    """
    Return the list of tickers for a given sector.
    """
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT ticker
            FROM stocks
            WHERE sector = ? COLLATE NOCASE
            ORDER BY ticker
            """,
            (sector,),
        )
        rows = cur.fetchall()
        return [r[0] for r in rows]
    finally:
        conn.close()


def get_stocks_in_list(list_name: str, db_path: str = STOCKS_LISTS_DB) -> List[str]:
    """
    Return all tickers that belong to a given list.
    Uses lists → list_stocks → stocks many-to-many relationship.
    """
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT s.ticker
            FROM stocks AS s
            JOIN list_stocks AS ls ON ls.stock_id = s.id
            JOIN lists AS l ON l.id = ls.list_id
            WHERE l.name = ? COLLATE NOCASE
            ORDER BY s.ticker
            """,
            (list_name,),
        )
        rows = cur.fetchall()
        return [r[0] for r in rows]
    finally:
        conn.close()


def get_all_sectors(db_path: str = STOCKS_LISTS_DB) -> List[str]:
    """
    Return all distinct sectors in the stocks table.
    """
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT DISTINCT sector FROM stocks WHERE sector IS NOT NULL ORDER BY sector"
        )
        rows = cur.fetchall()
        return [r[0] for r in rows]
    finally:
        conn.close()


def get_all_lists(db_path: str = STOCKS_LISTS_DB) -> List[str]:
    """
    Return all list names from the lists table.
    """
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.execute("SELECT name FROM lists ORDER BY name")
        rows = cur.fetchall()
        return [r[0] for r in rows]
    finally:
        conn.close()


def build_ticker_memberships(
    db_path: str = STOCKS_LISTS_DB,
) -> Tuple[Dict[str, str], Dict[str, List[str]]]:
    """
    Build:
      - ticker_to_sector: ticker -> sector
      - ticker_to_lists : ticker -> [list_name, ...]
    """
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()

        # ticker -> sector
        cur.execute("SELECT ticker, sector FROM stocks")
        ticker_to_sector: Dict[str, str] = {}
        for ticker, sector in cur.fetchall():
            ticker_to_sector[ticker] = sector

        # ticker -> [list_name, ...]
        cur.execute(
            """
            SELECT s.ticker, l.name
            FROM stocks AS s
            JOIN list_stocks AS ls ON ls.stock_id = s.id
            JOIN lists AS l ON l.id = ls.list_id
            """
        )
        ticker_to_lists: DefaultDict[str, List[str]] = defaultdict(list)
        for ticker, list_name in cur.fetchall():
            ticker_to_lists[ticker].append(list_name)

        return ticker_to_sector, dict(ticker_to_lists)
    finally:
        conn.close()
