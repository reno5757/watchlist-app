import { NextRequest, NextResponse } from 'next/server';
import { getAppDb } from '@/lib/db-app';

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const db = getAppDb();
  const { id } = await ctx.params;
  const wlId = Number(id);
  if (!Number.isFinite(wlId)) {
    return NextResponse.json({ error: 'Invalid watchlist id' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const ticker = typeof body.ticker === 'string' ? body.ticker.trim() : '';
  const subcategory =
    typeof body.subcategory === 'string' && body.subcategory.trim() !== ''
      ? body.subcategory.trim()
      : null;

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
  }

  // Ensure WL exists
  const wl = db
    .prepare(`SELECT id FROM watchlists WHERE id = ?`)
    .get(wlId);
  if (!wl) {
    return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 });
  }

  const stmt = db.prepare(
    `INSERT INTO watchlist_items (watchlist_id, ticker, subcategory)
     VALUES (?, ?, ?)`
  );
  const result = stmt.run(wlId, ticker, subcategory);

  return NextResponse.json(
    {
      item_id: result.lastInsertRowid,
      ticker,
      subcategory,
      last_price: null,
      perf_d: null,
      perf_w: null,
      perf_m: null,
      perf_ytd: null,
    },
    { status: 201 }
  );
}
