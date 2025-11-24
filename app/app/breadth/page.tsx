// app/breadth/page.tsx
import { getLatestBreadthForLists } from '@/lib/breadthQueries';
import { BreadthTable } from '@/components/BreadthTable';

const LIST_CATEGORY = {
  'Communication Services': 'sector',
  'Consumer Discretionary': 'sector',
  'Consumer Staples': 'sector',
  'Energy': 'sector',
  'Financials': 'sector',
  'Health Care': 'sector',
  'Industrials': 'sector',
  'Information Technology': 'sector',
  'Materials': 'sector',
  'Real Estate': 'sector',
  'Utilities': 'sector',
  'All US Stocks': 'index',
  'Dow Jones Stocks': 'index',
  'Koyfin Russell 2000': 'index',
  'Nasdaq 100 Stocks': 'index',
  'Sp 500 Stocks': 'index',
};

function splitByCategory(rows: Awaited<ReturnType<typeof getLatestBreadthForLists>>) {
  const indexes: typeof rows = [];
  const sectors: typeof rows = [];
  const others: typeof rows = [];

  for (const row of rows) {
    const cat = LIST_CATEGORY[row.groupName] ?? 'other';
    if (cat === 'index') indexes.push(row);
    else if (cat === 'sector') sectors.push(row);
    else others.push(row);
  }

  return { indexes, sectors, others };
}

export default async function BreadthPage() {
  const rows = await getLatestBreadthForLists();

  if (rows.length === 0) {
    return <main className="p-4 text-sm text-zinc-400">No breadth data available.</main>;
  }

  const { indexes, sectors, others } = splitByCategory(rows);
  const date = rows[0].date;

  return (
    <main className="p-4 space-y-6 text-zinc-100">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Breadth Dashboard</h1>
          <p className="text-xs text-zinc-500">Daily breadth metrics (latest close)</p>
        </div>

        <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-[11px] text-zinc-400">
          Date: <span className="font-mono text-zinc-200">{date}</span>
        </span>
      </header>

      <BreadthTable title="Indexes" data={indexes} />
      <BreadthTable title="Sectors (via lists)" data={sectors} />
      <BreadthTable title="Other lists" data={others} />
    </main>
  );
}
