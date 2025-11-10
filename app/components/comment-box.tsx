'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input'; // ⬅️ using Input instead of Textarea
import { Separator } from '@/components/ui/separator';

type Comment = { box_index: 1 | 2; text: string };

export default function CommentBox({ watchlistItemId }: { watchlistItemId?: number }) {
  // Hard guard: if no id, render nothing and do nothing.
  if (!watchlistItemId || !Number.isFinite(watchlistItemId)) return null;

  const [c1, setC1] = useState('');
  const [c2, setC2] = useState('');
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const res = await fetch(`/api/watchlists/${watchlistItemId}?comments=1`, { cache: 'no-store' });
      if (!res.ok) return;
      const rows: Comment[] = await res.json();
      if (!isMounted) return;
      const b1 = rows.find(r => r.box_index === 1)?.text ?? '';
      const b2 = rows.find(r => r.box_index === 2)?.text ?? '';
      setC1(b1);
      setC2(b2);
    })();
    return () => {
      isMounted = false;
    };
  }, [watchlistItemId]);

  async function save(idx: 1 | 2, text: string) {
    try {
      setSaving('saving');
      const body = { watchlist_item_id: watchlistItemId, box_index: idx, text };
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setSaving('saved');
      setTimeout(() => setSaving('idle'), 800);
    } catch {
      setSaving('error');
      setTimeout(() => setSaving('idle'), 1200);
    }
  }

  return (
    <div className="w-full">
      <Input
        value={c1}
        onChange={e => setC1(e.target.value)}
        onBlur={() => save(1, c1)}
        placeholder="Comment 1…"
        className="mb-2 w-full"
      />
      <Separator className="my-2" />
      <Input
        value={c2}
        onChange={e => setC2(e.target.value)}
        onBlur={() => save(2, c2)}
        placeholder="Comment 2…"
        className="w-full"
      />
      <div className="mt-1 text-xs text-muted-foreground">
        {saving === 'saving'
          ? 'Saving…'
          : saving === 'saved'
          ? 'Saved.'
          : saving === 'error'
          ? 'Error.'
          : 'Auto-save on blur'}
      </div>
    </div>
  );
}
