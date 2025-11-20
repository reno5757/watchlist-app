import { NextRequest, NextResponse } from 'next/server';
import { getStocksDb } from '@/lib/db-stocks';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const ticker = url.searchParams.get('ticker')?.toUpperCase();
  const days = Number(url.searchParams.get('days') ?? 360);

  if (!ticker) {
    return NextResponse.json({ error: 'Missing ticker' }, { status: 400 });
  }
  if (!Number.isFinite(days) || days <= 0 || days > 10000) {
    return NextResponse.json({ error: 'Invalid days' }, { status: 400 });
  }

  try {
    const db = getStocksDb();
    // Expecting schema: prices_daily(ticker TEXT, date TEXT YYYY-MM-DD, open REAL, high REAL, low REAL, close REAL, volume REAL)
    const rows = db.prepare(
      `
      SELECT date, open, high, low, close
      FROM prices
      WHERE symbol = ? AND date >= date('now', ?)
      ORDER BY date ASC
      `
    ).all(ticker, `-${days} days`);

    // Lightweight Charts expects { time: 'YYYY-MM-DD', open, high, low, close }
    const data = rows.map((r: any) => ({
      time: r.date, open: r.open, high: r.high, low: r.low, close: r.close,
    }));

    return NextResponse.json({ ticker, days, data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Query failed' }, { status: 500 });
  }
}
