// app/api/watchlists/[id]/metrics/route.ts
import { NextResponse } from 'next/server';
import { getAppDb } from '@/lib/db-app';
import { getMetricsDb } from '@/lib/db-metrics';

type MetricsRow = {
  symbol: string;
  date: string;
  daily_return: number | null;
  return_5d: number | null;
  return_21d: number | null;
  return_63d: number | null;
  return_ytd: number | null;
  ma10_slope: number | null;
  ma20_slope: number | null;
  ma50_slope: number | null;
  ma200_slope: number | null;
  dist_52w_high: number | null;
  dist_52w_low: number | null;
};

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;  // IMPORTANT: await the promise
  const watchlistId = Number(id);

  if (!Number.isFinite(watchlistId)) {
    return NextResponse.json(
      { error: 'Invalid watchlist id' },
      { status: 400 }
    );
  }

  try {
    const appDb = getAppDb();
    const metricsDb = getMetricsDb();

    // 1) Load tickers for this watchlist
    const items = appDb
      .prepare(`SELECT ticker FROM watchlist_items WHERE watchlist_id = ?`)
      .all(watchlistId) as { ticker: string }[];

    if (items.length === 0) {
      return NextResponse.json<MetricsRow[]>([]);
    }

    const tickers = items.map((it) => it.ticker);

    // 2) Latest date from metrics table
    const latestDateRow = metricsDb
      .prepare(`SELECT MAX(date) AS date FROM metrics`)
      .get() as { date?: string };

    if (!latestDateRow?.date) {
      return NextResponse.json<MetricsRow[]>([]);
    }

    const latestDate = latestDateRow.date;

    // 3) Build query with IN (?, ?, ...)
    const placeholders = tickers.map(() => '?').join(',');
    const sql = `
      SELECT
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
      FROM metrics
      WHERE date = ?
        AND symbol IN (${placeholders})
      ORDER BY symbol;
    `;

    const rows = metricsDb.prepare(sql).all(latestDate, ...tickers) as MetricsRow[];

    return NextResponse.json(rows);
  } catch (err) {
    console.error('Error in GET /api/watchlists/[id]/metrics:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
