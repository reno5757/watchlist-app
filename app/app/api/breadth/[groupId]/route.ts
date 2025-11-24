// app/api/breadth/[groupId]/route.ts
import { NextResponse } from 'next/server';
import getBreadthDb from '@/lib/db-breadth';

export async function GET(
  _req: Request,
  context: { params: Promise<{ groupId: string }> }
) {
  const { groupId: groupIdRaw } = await context.params;   // <-- FIX
  const groupId = Number(groupIdRaw);

  if (Number.isNaN(groupId)) {
    return NextResponse.json({ error: 'Invalid groupId' }, { status: 400 });
  }

  const db = getBreadthDb();

const rows = db
  .prepare(
    `
      SELECT
        date,
        total,
        adv         AS adv,
        dec         AS dec,
        above_ma5   AS aboveMa5,
        above_ma10  AS aboveMa10,
        above_ma20  AS aboveMa20,
        above_ma50  AS aboveMa50,
        above_ma200 AS aboveMa200,
        spike_up    AS spikeUp,
        spike_down  AS spikeDown,
        mcclellan   AS mcclellan
      FROM breadth
      WHERE group_id = ?
      ORDER BY date
      `
  )
  .all(groupId) as {
    date: string;
    total: number;
    adv : number;
    dec : number;
    aboveMa5: number;
    aboveMa10: number;
    aboveMa20: number;
    aboveMa50: number;
    aboveMa200: number;
    spikeUp: number;
    spikeDown: number;
    mcclellan: number;
  }[];


  return NextResponse.json(rows);
}
