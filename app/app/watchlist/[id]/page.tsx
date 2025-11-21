'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';

import EditWatchlistModal from '@/components/edit-watchlist-modal';
import WatchlistChartTab from '@/components/watchlist-chart-tab';
import WatchlistMetricsTab from '@/components/watchlist-metrics-tab';
import WatchlistRadar from '@/components/WatchlistRadar';
import WatchlistPerformance from '@/components/WatchlistPerformance';
import WatchlistDrawdownVsReturnChart from '@/components/WatchlistDrawdownVsReturnChart';
import WatchlistSortControls from '@/components/WatchlistSortControls';

import {
  MetricsRow,
  SortKey,
  SortDirection,
  sortItems,
  parseDefaultSort,
  WatchlistPayload,
} from '@/lib/watching-sorting';

export type { WatchlistPayload as WatchlistPayloadType };

export default function WatchlistPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const queryClient = useQueryClient();

  // 1) Watchlist
  const {
    data,
    isLoading,
    error,
  } = useQuery<WatchlistPayload>({
    queryKey: ['watchlist', id],
    queryFn: async () => {
      const res = await fetch(`/api/watchlists/${id}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load watchlist');
      return res.json();
    },
  });

  // 2) Metrics
  const { data: metrics } = useQuery<MetricsRow[]>({
    queryKey: ['watchlist-metrics', id],
    queryFn: async () => {
      const res = await fetch(`/api/watchlists/${id}/metrics`);
      if (!res.ok) throw new Error('Failed to load metrics');
      return res.json();
    },
    enabled: !!data,
  });

  // 3) Local sort state
  const [sortKey, setSortKey] = useState<SortKey>('saved');
  const [sortDirection, setSortDirection] =
    useState<SortDirection>('desc');

  useEffect(() => {
    if (!data) return;
    const parsed = parseDefaultSort(data.default_sort);
    setSortKey(parsed.key);
    setSortDirection(parsed.direction);
  }, [data?.default_sort, data]);

  // 4) Metrics map
  const metricsMap = useMemo(() => {
    const map = new Map<string, MetricsRow>();
    (metrics || []).forEach((m) => {
      map.set(m.symbol, m);
    });
    return map;
  }, [metrics]);

  // 5) Sorted items
  const sortedItems = useMemo(() => {
    if (!data) return [];
    return sortItems(data, sortKey, sortDirection, metricsMap);
  }, [data, sortKey, sortDirection, metricsMap]);

  // 6) Persist default_sort + items_order
  const reorderMutation = useMutation({
    mutationFn: async (payload: {
      sortKey: SortKey;
      sortDirection: SortDirection;
      items_order: number[];
    }) => {
      const default_sort =
        payload.sortKey === 'saved'
          ? 'saved'
          : `${payload.sortKey}_${payload.sortDirection}`;

      await fetch(`/api/watchlists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_sort,
          items_order: payload.items_order,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['watchlist', id],
      });
    },
  });

  const applyAndPersistSort = (
    newKey: SortKey,
    newDirection: SortDirection
  ) => {
    if (!data) return;
    const newItems = sortItems(
      data,
      newKey,
      newDirection,
      metricsMap
    );
    const items_order = newItems.map((i) => i.item_id);

    setSortKey(newKey);
    setSortDirection(newDirection);

    reorderMutation.mutate({
      sortKey: newKey,
      sortDirection: newDirection,
      items_order,
    });
  };

  const handleSortKeyChange = (value: SortKey) => {
    applyAndPersistSort(value, sortDirection);
  };

  const handleSortDirectionChange = (value: SortDirection) => {
    applyAndPersistSort(sortKey, value);
  };

  // 7) Early returns (after hooks)
  if (isLoading || !data) return <p>Loading…</p>;
  if (error) {
    return (
      <p className="text-red-500">Error loading watchlist</p>
    );
  }

  const watchlistWithSortedItems: WatchlistPayload = {
    ...data,
    items: sortedItems,
  };

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{data.title}</h1>
          {data.intro ? (
            <p className="text-sm text-muted-foreground">
              {data.intro}
            </p>
          ) : null}
        </div>
        <EditWatchlistModal watchlist={data} />
      </header>

      <Tabs defaultValue="charts" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <TabsList className="inline-flex h-9 items-center rounded-full border border-zinc-700 bg-zinc-900/80 p-1 shadow-sm">
            {/* your existing tab triggers */}
            <TabsTrigger value="charts" className="px-4 py-1.5 text-xs font-medium rounded-full text-zinc-400 transition-all hover:text-zinc-200 hover:bg-zinc-700/30 data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm">
              Charts
            </TabsTrigger>
            <TabsTrigger value="metrics" className="px-4 py-1.5 text-xs font-medium rounded-full text-zinc-400 transition-all hover:text-zinc-200 hover:bg-zinc-700/30 data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm">
              Metrics
            </TabsTrigger>
            <TabsTrigger value="as-radar" className="px-4 py-1.5 text-xs font-medium rounded-full text-zinc-400 transition-all hover:text-zinc-200 hover:bg-zinc-700/30 data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm">
              AS Radar
            </TabsTrigger>
            <TabsTrigger value="performance-chart" className="px-4 py-1.5 text-xs font-medium rounded-full text-zinc-400 transition-all hover:text-zinc-200 hover:bg-zinc-700/30 data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm">
              Performance Chart
            </TabsTrigger>
            <TabsTrigger value="drawdown-chart" className="px-4 py-1.5 text-xs font-medium rounded-full text-zinc-400 transition-all hover:text-zinc-200 hover:bg-zinc-700/30 data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm">
              Risk Return
            </TabsTrigger>
          </TabsList>

          <WatchlistSortControls
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortKeyChange={handleSortKeyChange}
            onSortDirectionChange={handleSortDirectionChange}
          />
        </div>

        <TabsContent value="charts">
          <WatchlistChartTab watchlist={watchlistWithSortedItems} />
        </TabsContent>

        <TabsContent value="metrics">
          <WatchlistMetricsTab watchlistId={data.id} />
        </TabsContent>

        <TabsContent value="as-radar">
          <WatchlistRadar watchlist={watchlistWithSortedItems}/>
        </TabsContent>

        <TabsContent value="performance-chart">
          <WatchlistPerformance watchlist={watchlistWithSortedItems} />
        </TabsContent>

        <TabsContent value="drawdown-chart">
          <WatchlistDrawdownVsReturnChart watchlistId={data.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
