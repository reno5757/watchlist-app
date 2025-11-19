'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { useTheme } from 'next-themes';
import CommentBox from './comment-box';
import { BarSeries, LineSeries } from 'lightweight-charts';

type EmaLine = {
  id: string;
  length: number;
  color: string;
  visible: boolean;
};

type EmaConfig = {
  emas_enabled: boolean;
  lines: EmaLine[];
};

type Props = {
  ticker: string;
  watchlistItemId: number;
  days?: number;
  height?: number; // px
  showTitle?: boolean;

  // ⬇⬇⬇ EMAs: global chart EMA config
  emaConfig?: EmaConfig;
};

// ⬇⬇⬇ EMAs: simple EMA calculation on close prices
function computeEMA(
  points: Array<{ time: any; close: number }>,
  length: number
): Array<{ time: any; value: number }> {
  if (!length || length <= 0 || points.length === 0) return [];

  const k = 2 / (length + 1);
  const result: Array<{ time: any; value: number }> = [];
  let ema: number | null = null;

  for (const p of points) {
    if (ema == null) {
      ema = p.close;
    } else {
      ema = p.close * k + ema * (1 - k);
    }
    result.push({ time: p.time, value: ema });
  }

  return result;
}

export default function ChartTile({
  ticker,
  watchlistItemId,
  days = 180,
  height = 240,
  showTitle = true,
  emaConfig, // ⬅ EMAs
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const { theme } = useTheme();

  const [chartReady, setChartReady] = useState(false);

  // ⬇⬇⬇ EMAs: keep references to EMA line series by id
  const emaSeriesRef = useRef<Record<string, any>>({});

  // OHLC fetch
  const { data } = useQuery({
    queryKey: ['ohlc', ticker, days],
    queryFn: async () => {
      const res = await fetch(
        `/api/ohlc?ticker=${encodeURIComponent(ticker)}&days=${days}`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error('Failed to fetch OHLC');
      return res.json() as Promise<{
        data: Array<{
          time: string;
          open: number;
          high: number;
          low: number;
          close: number;
        }>;
      }>;
    },
  });

  // Theme palette
  const colors = useMemo(() => {
    const dark = theme === 'dark' || theme === 'system';
    return {
      bg: 'transparent',
      text: dark ? '#e5e7eb' : '#111827',
      grid: dark ? '#1f2937' : '#e5e7eb',
      up: '#ffffff', // white bars
      down: '#ffffff', // white bars
      wick: dark ? '#9ca3af' : '#6b7280',
    };
  }, [theme]);

  // Create chart on client, ensure non-zero container size first
  useEffect(() => {
    let cancelled = false;
    setChartReady(false);

    const init = async () => {
      if (!containerRef.current || chartRef.current) return;

      // wait until container has width & height
      const ensureSize = () => {
        const w = Math.floor(containerRef.current!.clientWidth);
        const h = Math.floor(containerRef.current!.clientHeight || height);
        return { w, h };
      };

      let { w, h } = ensureSize();
      if (w <= 0 || h <= 0) {
        await new Promise(requestAnimationFrame);
        ({ w, h } = ensureSize());
        if (w <= 0) w = 320;
        if (h <= 0) h = height;
      }

      const { createChart, BarSeries, LineSeries } = await import('lightweight-charts');

      if (cancelled || !containerRef.current) return;

      const chart = createChart(containerRef.current, {
        width: w,
        height: h,
        layout: { background: { color: colors.bg }, textColor: colors.text },
        rightPriceScale: { borderVisible: false },
        timeScale: {
          borderVisible: false,
          timeVisible: false,
          rightOffsetPixels: 25,
        },
        grid: {
          vertLines: { color: colors.grid, style: 1 },
          horzLines: { color: colors.grid, style: 1 },
        },
        crosshair: { mode: 0 },
      });
      chartRef.current = chart;

      const series = chart.addSeries(BarSeries, {
        upColor: colors.up,
        downColor: colors.down,
        priceLineVisible: false,
      });
      seriesRef.current = series;

      setChartReady(true);

      // keep chart width in sync
      const ro = new ResizeObserver((entries) => {
        for (const e of entries) {
          const newW = Math.max(100, Math.floor(e.contentRect.width));
          chart.applyOptions({ width: newW });
          chart.timeScale().fitContent();
        }
      });
      ro.observe(containerRef.current);
      roRef.current = ro;
    };

    init();

    return () => {
      cancelled = true;
      roRef.current?.disconnect();
      roRef.current = null;

      // ⬇⬇⬇ EMAs: clear EMA series handles on unmount
      emaSeriesRef.current = {};

      if (chartRef.current) {
        chartRef.current.remove?.();
        chartRef.current = null;
        seriesRef.current = null;
      }
      setChartReady(false);
    };
  }, [height, colors]);

  // Update theme colors dynamically
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;
    chartRef.current.applyOptions({
      layout: {
        background: { type: 'solid', color: colors.bg },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid, style: 1 },
        horzLines: { color: colors.grid, style: 1 },
      },
    });
    seriesRef.current.applyOptions({
      upColor: colors.up,
      downColor: colors.down,
      priceLineVisible: false,
    });
  }, [colors]);

  // Set OHLC data
  useEffect(() => {
    if (!chartReady || !data?.data || !seriesRef.current) return;

    const formatted = data.data
      .filter(
        (p: any) =>
          p?.time &&
          p.open != null &&
          p.high != null &&
          p.low != null &&
          p.close != null
      )
      .map((p: any) => {
        if (typeof p.time === 'string') {
          const [y, m, d] = p.time.split('-').map(Number);
          return { ...p, time: { year: y, month: m, day: d } };
        }
        return p;
      });

    if (formatted.length > 0) {
      seriesRef.current.setData(formatted as any);
      chartRef.current?.timeScale().fitContent();
    }
  }, [data, chartReady]);

  // ⬇⬇⬇ EMAs: compute & draw EMA line series
  useEffect(() => {
    if (
      !chartReady ||
      !data?.data ||
      !chartRef.current ||
      !emaConfig ||
      !emaConfig.emas_enabled
    ) {
      // If EMAs are disabled, remove any existing EMA series
      const existing = emaSeriesRef.current;
      for (const id of Object.keys(existing)) {
        chartRef.current?.removeSeries?.(existing[id]);
      }
      emaSeriesRef.current = {};
      return;
    }

    const raw = data.data
      .filter(
        (p: any) =>
          p?.time &&
          p.open != null &&
          p.high != null &&
          p.low != null &&
          p.close != null
      )
      .map((p: any) => {
        if (typeof p.time === 'string') {
          const [y, m, d] = p.time.split('-').map(Number);
          return {
            time: { year: y, month: m, day: d },
            close: p.close,
          };
        }
        return { time: p.time, close: p.close };
      });

    if (raw.length === 0) {
      const existing = emaSeriesRef.current;
      for (const id of Object.keys(existing)) {
        chartRef.current?.removeSeries?.(existing[id]);
      }
      emaSeriesRef.current = {};
      return;
    }

    const visibleLines =
      emaConfig.lines?.filter(
        (l) => l.visible && typeof l.length === 'number' && l.length > 0
      ) ?? [];

    const existing = emaSeriesRef.current;
    const activeIds = new Set(visibleLines.map((l) => l.id));

    // Remove EMA series that are no longer active
    for (const id of Object.keys(existing)) {
      if (!activeIds.has(id)) {
        chartRef.current.removeSeries?.(existing[id]);
        delete existing[id];
      }
    }

    // Add / update series for each visible EMA
    for (const line of visibleLines) {
      let series = existing[line.id];
      if (!series) {
        series = chartRef.current.addSeries(LineSeries, {
          color: line.color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        existing[line.id] = series;
      } else {
        series.applyOptions({
          color: line.color,
        });
      }

      const emaData = computeEMA(raw, line.length);
      series.setData(emaData as any);
    }
  }, [data, chartReady, emaConfig]);

  // ⬇⬇⬇ EMAs: visible EMA lines for title display
  const visibleEmaLines: EmaLine[] =
    emaConfig && emaConfig.emas_enabled && Array.isArray(emaConfig.lines)
      ? emaConfig.lines.filter(
          (l) => l.visible && typeof l.length === 'number' && l.length > 0
        )
      : [];

  return (
    <Card className="p-2">
      {showTitle && (
        <div className="mb-1 text-sm font-semibold">
          <span>{ticker}</span>
          {visibleEmaLines.length > 0 && (
            <span
              style={{
                marginLeft: 8,
                fontSize: '0.75rem',
                fontWeight: 400,
              }}
            >
              {visibleEmaLines.map((line, idx) => (
                <span
                  key={line.id}
                  style={{ color: line.color }}
                >
                  {idx > 0 && ' · '}
                  EMA {line.length}
                </span>
              ))}
            </span>
          )}
        </div>
      )}
      {/* ensure container has explicit height so it’s never 0 */}
      <div ref={containerRef} style={{ width: '100%', height }} />
      <div className="mt-2">
        <CommentBox watchlistItemId={watchlistItemId} />
      </div>
    </Card>
  );
}
