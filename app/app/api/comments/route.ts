import { NextResponse } from 'next/server';
import { getAppDb } from '@/lib/db-app';

type Body = { watchlist_item_id: number; box_index: 1|2; text: string };

export async function POST(req: Request) {
  const { watchlist_item_id, box_index, text } = (await req.json()) as Body;

  if (!watchlist_item_id || ![1,2].includes(box_index)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const db = getAppDb();
  const existing = db.prepare(`
    SELECT id FROM comments WHERE watchlist_item_id = ? AND box_index = ?
  `).get(watchlist_item_id, box_index);

  if (existing) {
    db.prepare(`
      UPDATE comments SET text = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(text, (existing as any).id);
  } else {
    db.prepare(`
      INSERT INTO comments (watchlist_item_id, box_index, text, updated_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(watchlist_item_id, box_index, text);
  }

  return NextResponse.json({ ok: true });
}
