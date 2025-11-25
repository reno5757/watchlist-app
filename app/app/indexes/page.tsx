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

// 👉 Your static tickers + titles here
const STATIC_CHARTS: { id: string; ticker: string; title: string }[] = [
  { id: 'spy', ticker: 'SPY', title: 'SP 500' },
  { id: 'rsp', ticker: 'RSP', title: 'SP 500 Equal Weighted' },
  { id: 'qqq', ticker: 'QQQ', title: 'Nasdaq 100' },
  { id: 'qqqe', ticker: 'QQQE', title: 'Nasdaq 100 Equal Weighted' },
  { id: 'iwm', ticker: 'IWM', title: 'Russel 2000' },
];

export default function Indexes() {
  const [days, setDays] = useState<number>(60);

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
    <div className="space-y-4 p-4">
      {/* --- Top controls (Window + MAs status) --- */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">Window:</div>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">2 weeks</SelectItem>
              <SelectItem value="30">1 months</SelectItem>
              <SelectItem value="60">2 months</SelectItem>
              <SelectItem value="90">3 months</SelectItem>
              <SelectItem value="180">6 months</SelectItem>
              <SelectItem value="365">12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {emaLoading && (
            <span className="text-xs text-muted-foreground">
              Loading MAs…
            </span>
          )}
          {emaError && (
            <span className="text-xs text-red-500">
              MA config error
            </span>
          )}
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

      {/* --- Charts Grid --- */}
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
            className="rounded-xl bg-zinc-950/40 p-2"
          >
            <div className="mb-1 flex items-center justify-center">
              <div className="text-m font-semibold text-zinc-100">
                {cfg.title}
              </div>
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
