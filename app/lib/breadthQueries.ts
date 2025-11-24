// lib/breadthQueries.ts
import getBreadthDb from '@/lib/db-breadth';

export type BreadthRow = {
  groupId: number;
  groupName: string;
  groupType: 'list' | 'sector';
  date: string;

  total: number;
  adv: number;
  dec: number;
  newHigh52w: number;
  newLow52w: number;
  aboveMa5: number;
  aboveMa10: number;
  aboveMa20: number;
  aboveMa50: number;
  aboveMa200: number;
  spikeUp: number;
  spikeDown: number;
};

export async function getLatestBreadthForLists(): Promise<BreadthRow[]> {
  const db = getBreadthDb();

  // latest date in breadth table
  const latest = db
    .prepare('SELECT MAX(date) AS latestDate FROM breadth')
    .get() as { latestDate: string | null };

  if (!latest.latestDate) {
    return [];
  }

  const rows = db
    .prepare(
      `
      SELECT
        g.id            AS groupId,
        g.name          AS groupName,
        g.type          AS groupType,
        b.date          AS date,
        b.total         AS total,
        b.adv           AS adv,
        b.dec           AS dec,
        b.new_high_52w  AS newHigh52w,
        b.new_low_52w   AS newLow52w,
        b.above_ma5     AS aboveMa5,
        b.above_ma10    AS aboveMa10,
        b.above_ma20    AS aboveMa20,
        b.above_ma50    AS aboveMa50,
        b.above_ma200   AS aboveMa200,
        b.spike_up      AS spikeUp,
        b.spike_down    AS spikeDown
      FROM breadth b
      JOIN groups g ON g.id = b.group_id
      WHERE b.date = ?
      ORDER BY g.type, g.name
      `
    )
    .all(latest.latestDate) as BreadthRow[];

  return rows;
}
