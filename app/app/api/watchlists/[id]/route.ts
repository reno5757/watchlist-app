import { NextRequest, NextResponse } from 'next/server';
import { getAppDb } from '@/lib/db-app';

// GET handler 
// app/api/watchlists/[id]/route.ts
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const db = getAppDb();
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const commentsMode = url.searchParams.get('comments');

  // ---- comments mode ----
  if (commentsMode === '1') {
    const itemId = Number(id);
    if (!Number.isFinite(itemId)) {
      return NextResponse.json(
        { error: 'Invalid watchlist_item_id' },
        { status: 400 }
      );
    }
    const rows = db
      .prepare(
        `
      SELECT box_index, text
      FROM comments
      WHERE watchlist_item_id = ?
      ORDER BY box_index ASC
    `
      )
      .all(itemId);
    return NextResponse.json(rows);
  }

  // ---- normal watchlist ----
  const wlId = Number(id);
  if (!Number.isFinite(wlId)) {
    return NextResponse.json(
      { error: 'Invalid watchlist id' },
      { status: 400 }
    );
  }

  const wl = db
    .prepare(
      `
    SELECT id, title, intro, default_sort, group_by_subcategory
    FROM watchlists
    WHERE id = ?
  `
    )
    .get(wlId);
  if (!wl) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const items = db
    .prepare(
      `
    SELECT
      wi.id AS item_id,
      wi.ticker,
      wi.subcategory,
      wi.position
    FROM watchlist_items wi
    WHERE wi.watchlist_id = ?
    ORDER BY
      (wi.position IS NULL) ASC,    -- non-null positions first
      wi.position ASC,
      wi.id ASC                     -- fallback / tie-breaker
  `
    )
    .all(wlId);

  return NextResponse.json({
    ...wl,
    items: (items as any[]).map((r) => ({
      item_id: r.item_id,
      ticker: r.ticker,
      subcategory: r.subcategory,
      last_price: null, // keep your existing shape
    })),
  });
}

// ---- update title / intro / group_by_subcategory/order ----
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const db = getAppDb();
  const { id } = await ctx.params;
  const wlId = Number(id);
  if (!Number.isFinite(wlId)) {
    return NextResponse.json(
      { error: 'Invalid watchlist id' },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));

  const title =
    typeof body.title === 'string' ? body.title.trim() : undefined;
  const intro =
    typeof body.intro === 'string' ? body.intro.trim() : undefined;

  // group_by_subcategory
  let groupFlag: number | undefined;
  if (typeof body.group_by_subcategory === 'boolean') {
    groupFlag = body.group_by_subcategory ? 1 : 0;
  } else if (
    body.group_by_subcategory === 0 ||
    body.group_by_subcategory === 1
  ) {
    groupFlag = body.group_by_subcategory;
  }

  // default_sort
  let defaultSort: string | null | undefined;
  if (body.default_sort === null) {
    defaultSort = null;
  } else if (typeof body.default_sort === 'string') {
    const trimmed = body.default_sort.trim();
    defaultSort = trimmed !== '' ? trimmed : null;
  }

  // items_order: array of watchlist_item ids
  let itemsOrder: number[] | undefined;
  if (Array.isArray(body.items_order)) {
    const parsed = body.items_order.map(Number).filter((n) =>
      Number.isFinite(n)
    );
    if (parsed.length === body.items_order.length && parsed.length > 0) {
      itemsOrder = parsed;
    }
  }

  if (
    title === undefined &&
    intro === undefined &&
    groupFlag === undefined &&
    defaultSort === undefined &&
    itemsOrder === undefined
  ) {
    return NextResponse.json(
      { error: 'Nothing to update' },
      { status: 400 }
    );
  }

  const existing = db
    .prepare(
      `
    SELECT id, title, intro, group_by_subcategory, default_sort
    FROM watchlists
    WHERE id = ?
  `
    )
    .get(wlId);

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const newTitle = title !== undefined ? title : existing.title;
  const newIntro =
    intro !== undefined ? (intro || null) : existing.intro;
  const newGroupFlag =
    groupFlag !== undefined
      ? groupFlag
      : existing.group_by_subcategory;
  const newDefaultSort =
    defaultSort !== undefined
      ? defaultSort
      : existing.default_sort;

  const tx = db.transaction(() => {
    db.prepare(
      `
      UPDATE watchlists
      SET title = ?, intro = ?, group_by_subcategory = ?, default_sort = ?
      WHERE id = ?
    `
    ).run(newTitle, newIntro, newGroupFlag, newDefaultSort, wlId);

    if (itemsOrder) {
      itemsOrder.forEach((itemId: number, index: number) => {
        db.prepare(
          `
          UPDATE watchlist_items
          SET position = ?
          WHERE id = ? AND watchlist_id = ?
        `
        ).run(index, itemId, wlId);
      });
    }
  });

  tx();

  return NextResponse.json({
    id: wlId,
    title: newTitle,
    intro: newIntro,
    group_by_subcategory: newGroupFlag,
    default_sort: newDefaultSort,
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
