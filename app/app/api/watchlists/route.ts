import { NextResponse } from 'next/server';
import { getAppDb } from '@/lib/db-app';

export async function GET() {
  const db = getAppDb();
  const rows = db.prepare(`
    SELECT id, title, intro, default_sort, group_by_subcategory
    FROM watchlists
    ORDER BY id ASC
  `).all();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const title = (body.title ?? '').trim();
    const intro = (body.intro ?? '').trim() || null;
    const defaultSort = (body.defaultSort ?? '').trim() || null;
    const groupBySubcategory = body.groupBySubcategory ? 1 : 0;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const db = getAppDb();

    const stmt = db.prepare(
      `INSERT INTO watchlists (title, intro, default_sort, group_by_subcategory)
       VALUES (?, ?, ?, ?)`
    );

    const result = stmt.run(title, intro, defaultSort, groupBySubcategory);

    return NextResponse.json(
      {
        id: result.lastInsertRowid,
        title,
        intro,
        default_sort: defaultSort,
        group_by_subcategory: groupBySubcategory,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Error creating watchlist', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
