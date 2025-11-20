'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ChartTile from '@/components/chart-tile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  WatchlistPayload,
  WatchlistItemRow,
} from '@/app/watchlist/[id]/page';

// ==== Updated types: EMA + SMA support ====

type MovingAverageType = 'ema' | 'sma';

type ChartMaLine = {
  id: string;
  type: MovingAverageType;
  length: number;
  color: string;
  visible: boolean;
};

type ChartMaConfig = {
  ma_enabled: boolean;
  lines: ChartMaLine[];
};

type Props = {
  watchlist: WatchlistPayload;
};

export default function WatchlistChartTab({ watchlist }: Props) {
  const [cols, setCols] = useState<number>(3);
  const [days, setDays] = useState<number>(180);
  const [groupBySubcat, setGroupBySubcat] = useState<boolean>(
    watchlist.group_by_subcategory === 1
  );
  const [saving, setSaving] = useState(false);

  // 1) Load global MA (EMA/SMA) settings for the whole app
  const {
    data: maConfig,
    isLoading: emaLoading,
    error: emaError,
  } = useQuery<ChartMaConfig>({
    queryKey: ['chart-ma-config'],
    queryFn: async () => {
      const res = await fetch('/api/settings/chart-ema', {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load MA config');
      return res.json();
    },
  });

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

  const handleToggleGroupBySubcat = async () => {
    const next = !groupBySubcat;

    // optimistic UI
    setGroupBySubcat(next);
    setSaving(true);

    try {
      const res = await fetch(`/api/watchlists/${watchlist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_by_subcategory: next ? 1 : 0,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      console.error('Failed to update group_by_subcategory', err);
      setGroupBySubcat((prev) => !prev);
    } finally {
      setSaving(false);
    }
  };

  const showMas =
    maConfig?.ma_enabled &&
    maConfig.lines?.some((l) => l.visible && l.length > 0);

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

        <div className="ml-auto flex items-center gap-3">
          {/* Optional tiny status for MAs */}
          {emaLoading && (
            <span className="text-xs text-muted-foreground">
              Loading MAs…
            </span>
          )}
          {emaError && (
            <span className="text-xs text-red-500">
              MA config error
            </span>
          )}
          {showMas && !emaLoading && !emaError && (
            <span className="text-xs text-muted-foreground">
              MAs:&nbsp;
              {maConfig!.lines
                .filter((l) => l.visible && l.length > 0)
                .map((l) => `${l.type.toUpperCase()} ${l.length}`)
                .join(', ')}
            </span>
          )}

          <span className="text-sm text-muted-foreground">
            Group by subcategory
          </span>
          <button
            type="button"
            onClick={handleToggleGroupBySubcat}
            disabled={saving}
            className={`inline-flex h-7 items-center rounded-full border px-2 text-xs transition
              ${
                groupBySubcat
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-300'
              } ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
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
              maConfig={maConfig} // now MaConfig, handled in ChartTile,
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
                    maConfig={maConfig}
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
