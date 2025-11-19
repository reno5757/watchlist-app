import { NextRequest, NextResponse } from 'next/server';
import { getAppDb } from '@/lib/db-app';

// GET handler 
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const db = getAppDb();
  const { id } = await ctx.params;
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

// ---- update title / intro / group_by_subcategory ----
export async function PATCH(
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

  const title =
    typeof body.title === 'string' ? body.title.trim() : undefined;
  const intro =
    typeof body.intro === 'string' ? body.intro.trim() : undefined;

  // NEW: accept group_by_subcategory as boolean or 0/1
  let groupFlag: number | undefined;
  if (typeof body.group_by_subcategory === 'boolean') {
    groupFlag = body.group_by_subcategory ? 1 : 0;
  } else if (
    body.group_by_subcategory === 0 ||
    body.group_by_subcategory === 1
  ) {
    groupFlag = body.group_by_subcategory;
  }

  if (title === undefined && intro === undefined && groupFlag === undefined) {
    return NextResponse.json(
      { error: 'Nothing to update' },
      { status: 400 }
    );
  }

  const existing = db
    .prepare(
      `SELECT id, title, intro, group_by_subcategory
       FROM watchlists
       WHERE id = ?`
    )
    .get(wlId);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const newTitle = title !== undefined ? title : existing.title;
  const newIntro =
    intro !== undefined ? (intro || null) : existing.intro;
  const newGroupFlag =
    groupFlag !== undefined ? groupFlag : existing.group_by_subcategory;

  db.prepare(
    `UPDATE watchlists
       SET title = ?, intro = ?, group_by_subcategory = ?
     WHERE id = ?`
  ).run(newTitle, newIntro, newGroupFlag, wlId);

  return NextResponse.json({
    id: wlId,
    title: newTitle,
    intro: newIntro,
    group_by_subcategory: newGroupFlag,
  });
}


// ---- delete watchlist (items will cascade) ----
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const db = getAppDb();
  const { id } = await ctx.params;
  const wlId = Number(id);
  if (!Number.isFinite(wlId)) {
    return NextResponse.json({ error: 'Invalid watchlist id' }, { status: 400 });
  }

  const res = db.prepare(`DELETE FROM watchlists WHERE id = ?`).run(wlId);

  if (res.changes === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
