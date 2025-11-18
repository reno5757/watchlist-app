'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import AddWatchlistModal from '@/components/add-watchlist-modal';

type Watchlist = {
  id: number;
  title: string;
  intro: string | null;
  default_sort: string | null;
  group_by_subcategory: 0 | 1;
};

export default function Home() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['watchlists'],
    queryFn: async (): Promise<Watchlist[]> => {
      const res = await fetch('/api/watchlists', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load watchlists');
      return res.json();
    },
  });

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p className="text-red-500">Error loading watchlists</p>;

  return (
    <div className="space-y-4">
      {/*      TOP BUTTON       */}
      <div className="flex justify-end">
        <AddWatchlistModal />     {/* ← your modal trigger button */}
      </div>

      {/*   WATCHLISTS GRID     */}
      <div className="grid gap-4 sm:grid-cols-2">
        {data!.map((wl) => (
          <Link key={wl.id} href={`/watchlist/${wl.id}`}>
            <Card className="p-4 hover:bg-accent/30 transition">
              <h2 className="text-lg font-semibold">{wl.title}</h2>
              {wl.intro ? (
                <p className="text-sm text-muted-foreground">{wl.intro}</p>
              ) : null}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
