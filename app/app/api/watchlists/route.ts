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
