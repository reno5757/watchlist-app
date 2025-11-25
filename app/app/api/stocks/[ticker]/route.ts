// app/api/stocks/[ticker]/route.ts
import { NextResponse } from 'next/server';
import { getStocksListsDb } from '@/lib/db-stocks-list';

export const runtime = 'nodejs';

// ⬅ params MUST be awaited
export async function GET(req: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await context.params;
  const t = ticker.toUpperCase();

  try {
    const db = getStocksListsDb();

    const stmt = db.prepare(
      `SELECT id, ticker, sector, industry 
       FROM stocks
       WHERE ticker = ?`
    );

    const row = stmt.get(t);

    if (!row) {
      return NextResponse.json({ error: `Ticker '${t}' not found` }, { status: 404 });
    }

    return NextResponse.json(row);
  } catch (err) {
    console.error('stocks_lists.db error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
