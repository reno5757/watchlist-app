'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import EditWatchlistModal from '@/components/edit-watchlist-modal';
import WatchlistChartTab from '@/components/watchlist-chart-tab';
import WatchlistMetricsTab from '@/components/watchlist-metrics-tab';
import WatchlistRadar from '@/components/WatchlistRadar'; 
import WatchlistPerformance from '@/components/WatchlistPerformance';
import WatchlistDrawdownVsReturnChart from '@/components/WatchlistDrawdownVsReturnChart';

type WatchlistItemRow = {
  item_id: number;
  ticker: string;
  subcategory: string | null;
};

type WatchlistPayload = {
  id: number;
  title: string;
  intro: string | null;
  default_sort: string | null;
  group_by_subcategory: 0 | 1;
  items: WatchlistItemRow[];
};

export type { WatchlistPayload, WatchlistItemRow };

export default function WatchlistPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const {
    data,
    isLoading,
    error,
  } = useQuery<WatchlistPayload>({
    queryKey: ['watchlist', id],
    queryFn: async () => {
      const res = await fetch(`/api/watchlists/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load watchlist');
      return res.json();
    },
  });

  if (isLoading) return <p>Loading…</p>;
  if (error || !data)
    return <p className="text-red-500">Error loading watchlist</p>;

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{data.title}</h1>
          {data.intro ? (
            <p className="text-sm text-muted-foreground">{data.intro}</p>
          ) : null}
        </div>
        <EditWatchlistModal watchlist={data} />
      </header>

      <Tabs defaultValue="charts" className="space-y-4">
        <div className="flex items-center justify-between">
       <TabsList className="inline-flex h-9 items-center rounded-full border border-zinc-700 bg-zinc-900/80 p-1 shadow-sm">
        <TabsTrigger
          value="charts"
          className="
            px-4 py-1.5 text-xs font-medium rounded-full
            text-zinc-400 transition-all
            hover:text-zinc-200 hover:bg-zinc-700/30
            data-[state=active]:bg-zinc-100
            data-[state=active]:text-zinc-900
            data-[state=active]:shadow-sm
          "
        >
          Charts
        </TabsTrigger>

        <TabsTrigger
          value="metrics"
          className="
            px-4 py-1.5 text-xs font-medium rounded-full
            text-zinc-400 transition-all
            hover:text-zinc-200 hover:bg-zinc-700/30
            data-[state=active]:bg-zinc-100
            data-[state=active]:text-zinc-900
            data-[state=active]:shadow-sm
          "
        >
          Metrics
        </TabsTrigger>

        <TabsTrigger
          value="as-radar"
          className="
            px-4 py-1.5 text-xs font-medium rounded-full
            text-zinc-400 transition-all
            hover:text-zinc-200 hover:bg-zinc-700/30
            data-[state=active]:bg-zinc-100
            data-[state=active]:text-zinc-900
            data-[state=active]:shadow-sm
          "
        >
          AS Radar
        </TabsTrigger>
        
        <TabsTrigger
          value="performance-chart"
          className="
            px-4 py-1.5 text-xs font-medium rounded-full
            text-zinc-400 transition-all
            hover:text-zinc-200 hover:bg-zinc-700/30
            data-[state=active]:bg-zinc-100
            data-[state=active]:text-zinc-900
            data-[state=active]:shadow-sm
          "
        >
          Performance Chart
        </TabsTrigger>

        <TabsTrigger
          value="drawdown-chart"
          className="
            px-4 py-1.5 text-xs font-medium rounded-full
            text-zinc-400 transition-all
            hover:text-zinc-200 hover:bg-zinc-700/30
            data-[state=active]:bg-zinc-100
            data-[state=active]:text-zinc-900
            data-[state=active]:shadow-sm
          "
        >
          Risk Return
        </TabsTrigger>
        
      </TabsList>

        </div>

        <TabsContent value="charts">
          <WatchlistChartTab watchlist={data} />
        </TabsContent>

        <TabsContent value="metrics">
          <WatchlistMetricsTab watchlistId={data.id} />
        </TabsContent>

        <TabsContent value="as-radar">
          <WatchlistRadar watchlistId={data.id} />
        </TabsContent>

        <TabsContent value="performance-chart">
          <WatchlistPerformance watchlist={data} />
        </TabsContent>

        <TabsContent value="drawdown-chart">
          <WatchlistDrawdownVsReturnChart watchlistId={data.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
