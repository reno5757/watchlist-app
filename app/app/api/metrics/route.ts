import { NextResponse } from 'next/server';
import { getMetricsDb } from '@/lib/db-metrics';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ticker = url.searchParams.get('ticker');

  if (!ticker) {
    return NextResponse.json({ error: 'Missing ticker' }, { status: 400 });
  }

  const metricsDb = getMetricsDb();

  const latestDateRow = metricsDb
    .prepare(`SELECT MAX(date) AS date FROM metrics`)
    .get();

  if (!latestDateRow?.date) {
    return NextResponse.json([]);
  }

  const latestDate = latestDateRow.date;

  const row = metricsDb
    .prepare(
      `
      SELECT *
      FROM metrics
      WHERE symbol = ? AND date = ?
    `
    )
    .get(ticker, latestDate);

  return NextResponse.json(row ? row : {});
}
