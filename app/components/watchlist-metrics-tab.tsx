'use client';

import { useQuery } from '@tanstack/react-query';
import WatchlistMetricsTable from '@/components/watchlist-metrics-table';

type MetricsRow = {
  symbol: string;
  name?: string; // will be filled client-side
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

type StockInfo = {
  symbol: string;
  name?: string;
};

type Props = {
  watchlistId: number;
};

export default function WatchlistMetricsTab({ watchlistId }: Props) {
  const {
    data: metricsWithNames,
    isLoading,
    error,
  } = useQuery<MetricsRow[]>({
    queryKey: ['watchlist-metrics-with-names', watchlistId],
    enabled: !!watchlistId,
    queryFn: async () => {
      // 1) Get metrics
      const res = await fetch(`/api/watchlists/${watchlistId}/metrics`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load metrics');
      const metrics: MetricsRow[] = await res.json();

      // 2) Fetch all stock infos in parallel
      const infos: (StockInfo | null)[] = await Promise.all(
        metrics.map(async (row, idx) => {
          try {
            const url = `/api/stocks/${encodeURIComponent(row.symbol)}`;
            const r = await fetch(url, { cache: 'no-store' });

            if (!r.ok) {return null;}

            const json = (await r.json()) as StockInfo;

            return json;
          } catch (e) {
            console.error('Error fetching stock info for', row.symbol, e);
            return null;
          }
        })
      );

      // 3) Merge metrics + name from stock info
      const merged: MetricsRow[] = metrics.map((row, i) => {
        const info = infos[i];

        const name =
          info?.name ??
          undefined;

        const mergedRow: MetricsRow = {
          ...row,
          name,
        };
        return mergedRow;
      });
      return merged;
    },
  });

  return (
    <div className="space-y-2">
      {isLoading && (
        <p className="text-xs text-muted-foreground">Loading metrics…</p>
      )}
      {error && (
        <p className="text-xs text-red-500">Error loading metrics</p>
      )}

      {metricsWithNames && <WatchlistMetricsTable data={metricsWithNames} />}
    </div>
  );
}
