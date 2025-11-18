import { NextRequest, NextResponse } from 'next/server';
import { getAppDb } from '@/lib/db-app';

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ itemId: string }> }
) {
  const db = getAppDb();
  const { itemId } = await ctx.params;
  const idNum = Number(itemId);
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ error: 'Invalid item id' }, { status: 400 });
  }

  const res = db
    .prepare(`DELETE FROM watchlist_items WHERE id = ?`)
    .run(idNum);

  if (res.changes === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

// Optional: PATCH to edit ticker/subcategory if needed later
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ itemId: string }> }
) {
  const db = getAppDb();
  const { itemId } = await ctx.params;
  const idNum = Number(itemId);
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ error: 'Invalid item id' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const ticker = typeof body.ticker === 'string' ? body.ticker.trim() : undefined;
  const subcategory =
    typeof body.subcategory === 'string'
      ? body.subcategory.trim() || null
      : undefined;

  if (ticker === undefined && subcategory === undefined) {
    return NextResponse.json(
      { error: 'Nothing to update' },
      { status: 400 }
    );
  }

  const existing = db
    .prepare(`SELECT id, ticker, subcategory FROM watchlist_items WHERE id = ?`)
    .get(idNum);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const newTicker = ticker !== undefined ? ticker : existing.ticker;
  const newSubcategory =
    subcategory !== undefined ? subcategory : existing.subcategory;

  db.prepare(
    `UPDATE watchlist_items SET ticker = ?, subcategory = ? WHERE id = ?`
  ).run(newTicker, newSubcategory, idNum);

  return NextResponse.json({
    item_id: idNum,
    ticker: newTicker,
    subcategory: newSubcategory,
  });
}
