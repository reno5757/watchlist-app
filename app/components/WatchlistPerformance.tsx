'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, IChartApi, ISeriesApi, LineData, LineSeries } from 'lightweight-charts';
import { useTheme } from 'next-themes';
import { Card } from '@/components/ui/card';

import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import type { WatchlistPayload } from '@/app/watchlist/[id]/page';

function colorForIndex(i: number, total: number) {
  const hue = (i * 360) / total;
  return `hsl(${hue}, 65%, 55%)`;
}

type Props = {
  watchlist: WatchlistPayload;
};

type OhlcRow = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};
type OhlcResponse = {
  ticker: string;
  days: number;
  data: OhlcRow[];
};

type PerformanceSeries = {
  ticker: string;
  points: LineData[];
};

type PerformanceQueryResult = {
  series: PerformanceSeries[];
};

const COLOR_PALETTE = [
  '#4ade80', '#60a5fa', '#f97316',
  '#a855f7', '#facc15', '#f87171',
  '#2dd4bf', '#fb7185',
];

const PRESETS = [
  { label: '1m', value: 30 },
  { label: '3m', value: 90 },
  { label: '6m', value: 182 },
  { label: '12m', value: 365 },
];

export default function WatchlistPerformance({ watchlist }: Props) {
  const [days, setDays] = useState<number>(180);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesMapRef = useRef<Record<string, ISeriesApi<'Line'>>>({});
  const { theme } = useTheme();

  const colors = useMemo(() => {
    const dark = theme === 'dark' || theme === 'system';
    return {
      bg: 'transparent',
      text: dark ? '#e5e7eb' : '#282829ff',
      grid: dark ? '#282829ff' : '#e5e7eb',
    };
  }, [theme]);

  const tickers = useMemo(
    () => Array.from(new Set(watchlist.items.map((it) => it.ticker.toUpperCase()))),
    [watchlist.items]
  );

  const { data, isLoading, error } = useQuery<PerformanceQueryResult>({
    queryKey: ['watchlist-performance', watchlist.id, days],
    enabled: tickers.length > 0,
    queryFn: async () => {
      const responses = await Promise.all(
        tickers.map((ticker) =>
          fetch(`/api/ohlc?ticker=${encodeURIComponent(ticker)}&days=${days}`, {
            cache: 'no-store',
          }).then((res) => {
            if (!res.ok) throw new Error(`Failed loading OHLC for ${ticker}`);
            return res.json() as Promise<OhlcResponse>;
          })
        )
      );

      const series: PerformanceSeries[] = [];

      for (const resp of responses) {
        if (!resp.data?.length) continue;

        const base = resp.data[0].close || resp.data[0].open;
        if (!base || base <= 0) continue;

        const points = resp.data.map((row) => ({
          time: row.time,
          value: (row.close / base - 1) * 100,
        }));

        series.push({ ticker: resp.ticker, points });
      }

      return { series };
    },
  });

  // 👇 FIXED: chart init + proper cleanup of seriesMapRef
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      height: 420,
      layout: { background: { color: colors.bg }, textColor: colors.text },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: false, rightOffsetPixels: 50 },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      crosshair: { mode: 0 },
    });

    chartRef.current = chart;
    // 🔑 start with a fresh series map for this chart instance
    seriesMapRef.current = {};

    const resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      chart.applyOptions({ width });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      // 🔑 clear the map so we don't reuse dead series on next mount
      seriesMapRef.current = {};
    };
  }, [colors]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !data) return;

    const existing = seriesMapRef.current;
    const seen = new Set<string>();

    data.series.forEach((serie, idx) => {
      seen.add(serie.ticker);

      let s = existing[serie.ticker];
      if (!s) {
        const color = colorForIndex(idx, data.series.length);
        s = chart.addSeries(LineSeries, {
          title: serie.ticker,
          color,
          lineWidth: 2,
          priceFormat: { type: 'percent', precision: 2 },
          priceLineVisible: false,
        });
        existing[serie.ticker] = s;
      }

      s.setData(serie.points);
    });

    Object.keys(existing).forEach((ticker) => {
      if (!seen.has(ticker)) {
        chart.removeSeries(existing[ticker]);
        delete existing[ticker];
      }
    });

    chart.timeScale().fitContent();
  }, [data]);

  return (
    <div className="space-y-4">
      {/* === Controls === */}
      <div className="flex items-start flex-col gap-3">
        <div className="flex items-center justify-between w-80">
          <Label className="text-sm text-muted-foreground">Window</Label>
          <span className="text-xs text-muted-foreground tabular-nums">
            {days} days
          </span>
        </div>

        <Slider
          min={7}
          max={365}
          step={1}
          value={[days]}
          onValueChange={(v) => setDays(v[0])}
          className="w-80"
        />

        <div className="flex gap-2 w-80">
          {PRESETS.map((p) => (
            <Button
              key={p.value}
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setDays(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <div className="ml-auto text-xs text-muted-foreground">
          {isLoading && 'Loading performance…'}
          {error && <span className="text-red-500">Error loading data</span>}
        </div>
      </div>

      {/* === Chart === */}
      <Card className="p-2">
        <div className="mb-1 text-sm text-center font-semibold"> Performance Chart - {days} days </div>
        <div ref={containerRef} className="h-[420px] w-full" />
      </Card>
    </div>
  );
}
