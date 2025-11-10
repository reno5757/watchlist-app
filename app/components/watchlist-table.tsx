'use client';

import * as React from 'react';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, SortingState, getSortedRowModel } from '@tanstack/react-table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CommentBox from './comment-box';

type Row = {
  item_id: number;
  ticker: string;
  subcategory: string | null;
  last_price?: number | null;
  perf_d?: number | null;
  perf_w?: number | null;
  perf_m?: number | null;
  perf_ytd?: number | null;
};

export default function WatchlistTable({ rows }: { rows: Row[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'perf_m', desc: true }]);

  const columns = React.useMemo<ColumnDef<Row>[]>(() => [
    { accessorKey: 'ticker', header: 'Ticker', cell: ({ row }) => <span className="font-semibold">{row.original.ticker}</span> },
    { accessorKey: 'subcategory', header: 'Group', cell: ({ getValue }) => getValue() ? <Badge variant="secondary">{String(getValue())}</Badge> : null },
    { accessorKey: 'last_price', header: 'Price', cell: ({ getValue }) => formatNum(getValue()) },
    { accessorKey: 'perf_d', header: '%D', cell: ({ getValue }) => formatPct(getValue()) },
    { accessorKey: 'perf_w', header: '%W', cell: ({ getValue }) => formatPct(getValue()) },
    { accessorKey: 'perf_m', header: '%M', cell: ({ getValue }) => formatPct(getValue()) },
    { accessorKey: 'perf_ytd', header: 'YTD', cell: ({ getValue }) => formatPct(getValue()) },
    { id: 'comments', header: 'Notes', cell: ({ row }) => <CommentBox watchlistItemId={row.original.item_id} /> },
  ], []);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Card className="p-2">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b">
                {hg.headers.map(h => (
                  <th
                    key={h.id}
                    onClick={h.column.getToggleSortingHandler()}
                    className="p-2 text-left select-none cursor-pointer"
                    title="Sort"
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {{
                      asc: ' ▲',
                      desc: ' ▼',
                    }[h.column.getIsSorted() as string] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(r => (
              <tr key={r.id} className="border-b hover:bg-accent/30">
                {r.getVisibleCells().map(c => (
                  <td key={c.id} className="p-2">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function formatNum(v: unknown) {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : '—';
}
function formatPct(v: unknown) {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  return Number.isFinite(n) ? (n >= 0 ? `+${n.toFixed(2)}%` : `${n.toFixed(2)}%`) : '—';
}
