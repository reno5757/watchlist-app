// app/api/watchlists/route.ts
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

    const rawTitle =
      typeof body.title === 'string' ? body.title.trim() : '';
    if (!rawTitle) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const rawIntro =
      typeof body.intro === 'string' ? body.intro.trim() : '';
    const intro = rawIntro || null;

    let defaultSort: string | null = null;
    if (typeof body.default_sort === 'string') {
      const trimmed = body.default_sort.trim();
      defaultSort = trimmed !== '' ? trimmed : null;
    }

    let groupBy = 0;
    if (typeof body.group_by_subcategory === 'boolean') {
      groupBy = body.group_by_subcategory ? 1 : 0;
    } else if (
      body.group_by_subcategory === 0 ||
      body.group_by_subcategory === 1
    ) {
      groupBy = body.group_by_subcategory;
    }

    const db = getAppDb();
    const stmt = db.prepare(
      `INSERT INTO watchlists (title, intro, default_sort, group_by_subcategory)
       VALUES (?, ?, ?, ?)`
    );

    const result = stmt.run(rawTitle, intro, defaultSort, groupBy);

    return NextResponse.json(
      {
        id: result.lastInsertRowid,
        title: rawTitle,
        intro,
        default_sort: defaultSort,
        group_by_subcategory: groupBy,
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
