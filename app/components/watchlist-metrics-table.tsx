// components/watchlist-metrics-table.tsx
'use client';

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  ColumnDef,
} from '@tanstack/react-table';
import { useState } from 'react';

type MetricsRow = {
  symbol: string;
  date: string;
  daily_return: number | null;
  return_5d: number | null;
  return_21d: number | null;
  return_63d: number | null;
  return_126d: number | null;
  return_252d: number | null;
  ma10_slope: number | null;
  ma20_slope: number | null;
  ma50_slope: number | null;
  ma200_slope: number | null;
  dist_52w_high: number | null;
  dist_52w_low: number | null;
};

type Props = {
  data: MetricsRow[];
};

export default function WatchlistMetricsTable({ data }: Props) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'symbol', desc: false },
  ]);

  const columns: ColumnDef<MetricsRow>[] = [
    {
      accessorKey: 'symbol',
      header: 'Ticker',
      cell: (info) => (
        <span className="font-semibold text-xs text-zinc-100">
          {info.getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: 'daily_return',
      header: '1D',
      cell: (info) => {
        const v = info.getValue<number | null>();
        return (
          <span className={perfClass(v)}>{formatPct(v)}</span>
        );
      },
    },
    {
      accessorKey: 'return_5d',
      header: '5D',
      cell: (info) => {
        const v = info.getValue<number | null>();
        return (
          <span className={perfClass(v)}>{formatPct(v)}</span>
        );
      },
    },
    {
      accessorKey: 'return_21d',
      header: '1M',
      cell: (info) => {
        const v = info.getValue<number | null>();
        return (
          <span className={perfClass(v)}>{formatPct(v)}</span>
        );
      },
    },
    {
      accessorKey: 'return_63d',
      header: '3M',
      cell: (info) => {
        const v = info.getValue<number | null>();
        return (
          <span className={perfClass(v)}>{formatPct(v)}</span>
        );
      },
    },
    {
      accessorKey: 'return_126d',
      header: '6M',
      cell: (info) => {
        const v = info.getValue<number | null>();
        return (
          <span className={perfClass(v)}>{formatPct(v)}</span>
        );
      },
    },{
      accessorKey: 'return_252d',
      header: '12M',
      cell: (info) => {
        const v = info.getValue<number | null>();
        return (
          <span className={perfClass(v)}>{formatPct(v)}</span>
        );
      },
    },

    // ---- separate MA slope columns ----
    {
      accessorKey: 'ma10_slope',
      header: 'MA10',
      cell: (info) => slopePill(info.getValue<number | null>(), '10'),
      enableSorting: false,
    },
    {
      accessorKey: 'ma20_slope',
      header: 'MA20',
      cell: (info) => slopePill(info.getValue<number | null>(), '20'),
      enableSorting: false,
    },
    {
      accessorKey: 'ma50_slope',
      header: 'MA50',
      cell: (info) => slopePill(info.getValue<number | null>(), '50'),
      enableSorting: false,
    },
    {
      accessorKey: 'ma200_slope',
      header: 'MA200',
      cell: (info) => slopePill(info.getValue<number | null>(), '200'),
      enableSorting: false,
    },

    {
      accessorKey: 'dist_52w_high',
      header: 'To 52w High',
      cell: (info) => {
        const v = info.getValue<number | null>();
        return (
          <span className="text-zinc-200 tabular-nums">
            {formatPct(v)}
          </span>
        );
      },
    },
    {
      accessorKey: 'dist_52w_low',
      header: 'From 52w Low',
      cell: (info) => {
        const v = info.getValue<number | null>();
        return (
          <span className="text-zinc-200 tabular-nums">
            {formatPct(v)}
          </span>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!data.length) {
    return (
      <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-muted-foreground text-center">
        No metrics available for this watchlist.
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="mb-2 flex flex-col items-center gap-1">
        <h2 className="text-sm font-semibold text-zinc-100">
          Metrics (latest date)
        </h2>
        <span className="text-[11px] text-zinc-500">
          {data.length} row{data.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="overflow-x-auto rounded-md border border-zinc-800">
        <table className="min-w-full text-xs text-center">
          <thead className="border-b border-zinc-800 bg-zinc-900/70">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400 select-none cursor-pointer text-center"
                  >
                    <div className="flex items-center justify-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {{
                        asc: '↑',
                        desc: '↓',
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {table.getRowModel().rows.map((row, idx) => (
              <tr
                key={row.id}
                className={[
                  'transition-colors',
                  idx % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-950/70',
                  'hover:bg-zinc-900/60',
                ].join(' ')}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-2 py-1.5 align-middle text-center"
                  >
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function formatPct(val: number | null | undefined) {
  if (val == null || Number.isNaN(val)) return '—';
  const pct = val * 100;
  const base = pct.toFixed(2) + '%';
  return pct > 0 ? `+${base}` : base;
}

function perfClass(val: number | null | undefined) {
  if (val == null || Number.isNaN(val)) return 'text-zinc-400';
  if (val > 0) return 'text-emerald-400';
  if (val < 0) return 'text-red-400';
  return 'text-zinc-400';
}

function slopePill(slope: number | null, label: string) {
  if (slope == null) {
    return (
      <span className="inline-flex items-center justify-center gap-1 rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] text-zinc-500">
        <span className="text-[9px] font-medium tracking-wide">
          MA{label}
        </span>
        <span className="text-xs">?</span>
      </span>
    );
  }

  let arrow = '➜';
  let cls =
    'inline-flex items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-[10px]';

  if (slope > 0) {
    arrow = '▲';
    cls += ' border-emerald-500/60 bg-emerald-500/10 text-emerald-200';
  } else if (slope < 0) {
    arrow = '▼';
    cls += ' border-red-500/60 bg-red-500/10 text-red-200';
  } else {
    arrow = '➜';
    cls += ' border-zinc-700 bg-zinc-900 text-zinc-300';
  }

  return (
    <span className={cls}>
      <span className="text-[9px] font-medium tracking-wide">
        MA{label}
      </span>
      <span className="text-sm leading-none font-semibold">
        {arrow}
      </span>
    </span>
  );
}
