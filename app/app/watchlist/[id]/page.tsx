'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import ChartTile from '@/components/chart-tile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

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

export default function WatchlistPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [cols, setCols] = useState<number>(3);
  const [days, setDays] = useState<number>(180);

  const { data, isLoading, error } = useQuery({
    queryKey: ['watchlist', id],
    queryFn: async (): Promise<WatchlistPayload> => {
      const res = await fetch(`/api/watchlists/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load watchlist');
      return res.json();
    },
  });

  if (isLoading) return <p>Loading…</p>;
  if (error || !data) return <p className="text-red-500">Error loading watchlist</p>;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">{data.title}</h1>
        {data.intro ? <p className="text-sm text-muted-foreground">{data.intro}</p> : null}
      </header>

      <div className="flex gap-3 items-center">
        <div className="text-sm text-muted-foreground">Columns:</div>
        <Select value={String(cols)} onValueChange={(v) => setCols(Number(v))}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="4">4</SelectItem>
          </SelectContent>
        </Select>

        <div className="text-sm text-muted-foreground ml-4">Window:</div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="90">3 months</SelectItem>
            <SelectItem value="180">6 months</SelectItem>
            <SelectItem value="365">12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(280px, 1fr))` }}
      >
        {data.items.map((it) => (
          <ChartTile
            key={it.item_id}
            ticker={it.ticker}
            watchlistItemId={it.item_id}
            days={days}
            height={240}
          />
        ))}
      </div>
    </div>
  );
}
