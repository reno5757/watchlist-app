'use client';

import { useQuery } from '@tanstack/react-query';
import WatchlistMetricsTable from '@/components/watchlist-metrics-table';

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
  watchlistId: number;
};

export default function WatchlistMetricsTab({ watchlistId }: Props) {
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
  } = useQuery<MetricsRow[]>({
    queryKey: ['watchlist-metrics', watchlistId],
    enabled: !!watchlistId,
    queryFn: async () => {
      const res = await fetch(`/api/watchlists/${watchlistId}/metrics`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load metrics');
      return res.json();
    },
  });

  return (
    <div className="space-y-2">
      {metricsLoading && (
        <p className="text-xs text-muted-foreground">Loading metrics…</p>
      )}
      {metricsError && (
        <p className="text-xs text-red-500">Error loading metrics</p>
      )}
      {metrics && <WatchlistMetricsTable data={metrics} />}
    </div>
  );
}
