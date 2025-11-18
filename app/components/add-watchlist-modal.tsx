'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export default function AddWatchlistModal() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [intro, setIntro] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const resetForm = () => {
    setTitle('');
    setIntro('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/watchlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          intro,
          // default_sort and group_by_subcategory will just use defaults
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create watchlist');
      }

      await queryClient.invalidateQueries({ queryKey: ['watchlists'] });

      resetForm();
      setOpen(false);
    } catch (err: any) {
      setError(err.message || 'Error while creating watchlist');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
      >
        <span className="mr-1.5 text-base">＋</span>
        New watchlist
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900/95 p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-50">
                  Create a new watchlist
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Give it a short, descriptive name. You can edit it later.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-200">
                  Title<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  placeholder="e.g. US momentum, EU value, Tech leaders…"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-200">
                  Intro <span className="text-xs font-normal text-zinc-500">(optional)</span>
                </label>
                <textarea
                  value={intro}
                  onChange={(e) => setIntro(e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  rows={3}
                  placeholder="Short description of what this watchlist is for."
                />
              </div>

              {error && (
                <p className="text-sm text-red-400">
                  {error}
                </p>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Saving…' : 'Save watchlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
