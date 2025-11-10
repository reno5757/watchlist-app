import { NextRequest, NextResponse } from 'next/server';
import { getAppDb } from '@/lib/db-app';

// Note: params is a Promise in Next 15 route handlers
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const db = getAppDb();
  const { id } = await ctx.params;            // ← unwrap the Promise
  const url = new URL(req.url);
  const commentsMode = url.searchParams.get('comments');

  if (commentsMode === '1') {
    const itemId = Number(id);
    if (!Number.isFinite(itemId)) {
      return NextResponse.json({ error: 'Invalid watchlist_item_id' }, { status: 400 });
    }
    const rows = db.prepare(`
      SELECT box_index, text
      FROM comments
      WHERE watchlist_item_id = ?
      ORDER BY box_index ASC
    `).all(itemId);
    return NextResponse.json(rows);
  }

  const wlId = Number(id);
  if (!Number.isFinite(wlId)) {
    return NextResponse.json({ error: 'Invalid watchlist id' }, { status: 400 });
  }

  const wl = db.prepare(`
    SELECT id, title, intro, default_sort, group_by_subcategory
    FROM watchlists WHERE id = ?
  `).get(wlId);
  if (!wl) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const items = db.prepare(`
    SELECT wi.id AS item_id, wi.ticker, wi.subcategory
    FROM watchlist_items wi
    WHERE wi.watchlist_id = ?
    ORDER BY wi.id ASC
  `).all(wlId);

  return NextResponse.json({
    ...wl,
    items: items.map((r: any) => ({
      ...r,
      last_price: null,
      perf_d: null,
      perf_w: null,
      perf_m: null,
      perf_ytd: null,
    })),
  });
}
