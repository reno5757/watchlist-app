'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ChartTile from '@/components/chart-tile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

type Props = {};

// 👉 Define your static tickers + titles HERE
const STATIC_CHARTS: { id: string; ticker: string; title: string }[] = [
  { id: 'aapl', ticker: 'AAPL', title: 'Apple' },
  { id: 'msft', ticker: 'MSFT', title: 'Microsoft' },
  { id: 'goog', ticker: 'GOOGL', title: 'Alphabet' },
  // Add more:
  // { id: 'spy', ticker: 'SPY', title: 'S&P 500 ETF' },
];

export default function IndexesChartTab({}: Props) {
  const [days, setDays] = useState<number>(180);

  // Load global MA settings
  const {
    data: maConfig,
    isLoading: emaLoading,
    error: emaError,
  } = useQuery<ChartMaConfig>({
    queryKey: ['chart-ma-config'],
    queryFn: async () => {
      const res = await fetch('/api/settings/chart-ema', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load MA config');
      return res.json();
    },
  });

  const showMas =
    maConfig?.ma_enabled &&
    maConfig.lines?.some((l) => l.visible && l.length > 0);

  return (
    <div className="space-y-4">
      {/* --- Top controls (Window + MAs status) --- */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">Window:</div>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
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
          {emaLoading && (
            <span className="text-xs text-muted-foreground">Loading MAs…</span>
          )}
          {emaError && <span className="text-xs text-red-500">MA config error</span>}
          {showMas && !emaLoading && !emaError && (
            <span className="text-xs text-muted-foreground">
              MAs:&nbsp;
              {maConfig!.lines
                .filter((l) => l.visible && l.length > 0)
                .map((l) => `${l.type.toUpperCase()} ${l.length}`)
                .join(', ')}
            </span>
          )}
        </div>
      </div>

      {/* --- Charts Grid (no columns dropdown) --- */}
      <div
        className="
          grid gap-4
          sm:grid-cols-2
          lg:grid-cols-3
        "
      >
        {STATIC_CHARTS.map((cfg) => (
          <div
            key={cfg.id}
            className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-2"
          >
            <div className="mb-1 flex items-center justify-between">
              <div className="text-xs font-semibold text-zinc-100">
                {cfg.title}
              </div>
              <div className="text-[11px] text-zinc-500">{cfg.ticker}</div>
            </div>

            <ChartTile
              ticker={cfg.ticker}
              watchlistItemId={undefined as any}
              days={days}
              height={400}
              maConfig={maConfig}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
