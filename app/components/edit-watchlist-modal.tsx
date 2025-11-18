'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

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

export default function EditWatchlistModal({ watchlist }: { watchlist: WatchlistPayload }) {
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState(watchlist.title);
  const [intro, setIntro] = useState(watchlist.intro || '');
  const [items, setItems] = useState<WatchlistItemRow[]>(watchlist.items || []);

  const [newTicker, setNewTicker] = useState('');
  const [newSubcategory, setNewSubcategory] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const router = useRouter();

  // Sync local state when watchlist data changes
  useEffect(() => {
    setTitle(watchlist.title);
    setIntro(watchlist.intro || '');
    setItems(watchlist.items || []);
  }, [watchlist]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['watchlist', watchlist.id] });
    await queryClient.invalidateQueries({ queryKey: ['watchlists'] });
  };

  // Save title / intro
  const handleSaveMeta = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/watchlists/${watchlist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, intro }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update watchlist');
      }

      await invalidate();
    } catch (err: any) {
      setError(err.message || 'Error while updating watchlist');
    } finally {
      setSubmitting(false);
    }
  };

  // Add ticker
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicker.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/watchlists/${watchlist.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: newTicker.trim(),
          subcategory: newSubcategory.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to add item');
      }

      const created = await res.json();
      setItems((prev) => [...prev, created]);
      setNewTicker('');
      setNewSubcategory('');

      await invalidate();
    } catch (err: any) {
      setError(err.message || 'Error while adding item');
    } finally {
      setSubmitting(false);
    }
  };

  // Remove ticker
  const handleRemoveItem = async (itemId: number) => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/watchlist-items/${itemId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to remove item');
      }

      setItems((prev) => prev.filter((it) => it.item_id !== itemId));

      await invalidate();
    } catch (err: any) {
      setError(err.message || 'Error while removing item');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete whole watchlist
  const handleDeleteWatchlist = async () => {
    if (!confirm('Delete this watchlist and all its items?')) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/watchlists/${watchlist.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete watchlist');
      }

      await queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      setOpen(false);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Error while deleting watchlist');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
      >
        ✎ Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900/95 p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-50">Edit watchlist</h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Change the title, description, tickers or delete this watchlist.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* General */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-200">General</h3>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">
                    Intro
                  </label>
                  <textarea
                    value={intro}
                    onChange={(e) => setIntro(e.target.value)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                    rows={2}
                  />
                </div>
              </section>

              {/* Tickers */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-200">Tickers</h3>

                <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-950/40 p-2">
                  {items.length === 0 && (
                    <p className="text-xs text-zinc-500">No tickers yet.</p>
                  )}
                  {items.map((it) => (
                    <div
                      key={it.item_id}
                      className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-100">
                          {it.ticker}
                        </span>
                        {it.subcategory && (
                          <span className="text-[11px] text-zinc-400">
                            {it.subcategory}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.item_id)}
                        className="rounded-md border border-red-800 px-2 py-0.5 text-[11px] text-red-300 hover:bg-red-900/50"
                        disabled={submitting}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddItem} className="flex flex-wrap gap-2 text-xs">
                  <input
                    type="text"
                    value={newTicker}
                    onChange={(e) => setNewTicker(e.target.value)}
                    className="min-w-[120px] flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                    placeholder="Ticker (e.g. AAPL)"
                  />
                  <input
                    type="text"
                    value={newSubcategory}
                    onChange={(e) => setNewSubcategory(e.target.value)}
                    className="min-w-[120px] flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                    placeholder="Subcategory (optional)"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                  >
                    Add
                  </button>
                </form>
              </section>

               <button
                  type="button"
                  onClick={handleSaveMeta}
                  disabled={submitting}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? 'Saving…' : 'Save title & description'}
                </button>
              {/* Danger zone */}
              <section className="border-t border-zinc-800 pt-4">
                <h3 className="text-sm font-semibold text-red-400">Danger zone</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Deleting this watchlist will remove all its items.
                </p>
                <button
                  type="button"
                  onClick={handleDeleteWatchlist}
                  disabled={deleting}
                  className="mt-2 rounded-md border border-red-800 bg-red-950/60 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-900/80 disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Delete watchlist'}
                </button>
              </section>

              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
