'use client';

import { useMemo, useState } from 'react';
import ChartTile from '@/components/chart-tile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { WatchlistPayload, WatchlistItemRow } from '@/app/watchlist/[id]/page';

type Props = {
  watchlist: WatchlistPayload;
};

export default function WatchlistChartTab({ watchlist }: Props) {
  const [cols, setCols] = useState<number>(3);
  const [days, setDays] = useState<number>(180);
  const [groupBySubcat, setGroupBySubcat] = useState<boolean>(
    watchlist.group_by_subcategory === 1
  );

  const groupedItems = useMemo(() => {
    if (!groupBySubcat) return null;

    const groups: Record<string, WatchlistItemRow[]> = {};
    for (const item of watchlist.items) {
      const key =
        item.subcategory && item.subcategory.trim() !== ''
          ? item.subcategory
          : 'Uncategorized';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [watchlist.items, groupBySubcat]);

  return (
    <div className="space-y-4">
      {/* Controls row (only for charts) */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">Columns:</div>
          <Select
            value={String(cols)}
            onValueChange={(v) => setCols(Number(v))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="ml-4 flex items-center gap-2">
          <div className="text-sm text-muted-foreground">Window:</div>
          <Select
            value={String(days)}
            onValueChange={(v) => setDays(Number(v))}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="90">3 months</SelectItem>
              <SelectItem value="180">6 months</SelectItem>
              <SelectItem value="365">12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Group by subcategory
          </span>
          <button
            type="button"
            onClick={() => setGroupBySubcat((v) => !v)}
            className={`inline-flex h-7 items-center rounded-full border px-2 text-xs transition
              ${
                groupBySubcat
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-300'
              }`}
          >
            <span
              className={`mr-1 inline-block h-3 w-3 rounded-full ${
                groupBySubcat ? 'bg-primary' : 'bg-zinc-500'
              }`}
            />
            {groupBySubcat ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {/* Charts grid(s) */}
      {!groupedItems && (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(280px, 1fr))`,
          }}
        >
          {watchlist.items.map((it) => (
            <ChartTile
              key={it.item_id}
              ticker={it.ticker}
              watchlistItemId={it.item_id}
              days={days}
              height={240}
            />
          ))}
        </div>
      )}

      {groupedItems && (
        <div className="space-y-4">
          {Object.entries(groupedItems).map(([subcat, items]) => (
            <section
              key={subcat}
              className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-100">
                  {subcat}
                </h2>
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-400">
                  {items.length} {items.length === 1 ? 'ticker' : 'tickers'}
                </span>
              </div>

              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(280px, 1fr))`,
                }}
              >
                {items.map((it) => (
                  <ChartTile
                    key={it.item_id}
                    ticker={it.ticker}
                    watchlistItemId={it.item_id}
                    days={days}
                    height={240}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
