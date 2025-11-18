'use client';

import { useEffect, useMemo, useRef, useState } from 'react'; // ⬅ add useState
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { useTheme } from 'next-themes';
import CommentBox from './comment-box';
import { BarSeries } from 'lightweight-charts';

type Props = {
  ticker: string;
  watchlistItemId: number;
  days?: number;
  height?: number;       // px
  showTitle?: boolean;
};

export default function ChartTile({
  ticker,
  watchlistItemId,
  days = 180,
  height = 240,
  showTitle = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const { theme } = useTheme();

  const [chartReady, setChartReady] = useState(false); // ⬅ NEW

  // OHLC fetch
  const { data } = useQuery({
    queryKey: ['ohlc', ticker, days],
    queryFn: async () => {
      const res = await fetch(`/api/ohlc?ticker=${encodeURIComponent(ticker)}&days=${days}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch OHLC');
      return res.json() as Promise<{ data: Array<{ time: string; open: number; high: number; low: number; close: number }> }>;
    },
  });

  // Theme palette
  const colors = useMemo(() => {
    const dark = theme === 'dark' || theme === 'system';
    return {
      bg: 'transparent',
      text: dark ? '#e5e7eb' : '#111827',
      grid: dark ? '#1f2937' : '#e5e7eb',
      up: '#ffffff',   // white bars
      down: '#ffffff', // white bars
      wick: dark ? '#9ca3af' : '#6b7280',
    };
  }, [theme]);

  // Create chart on client, ensure non-zero container size first
  useEffect(() => {
    let cancelled = false;
    setChartReady(false); // ⬅ chart is not ready yet

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

      const { createChart, BarSeries } = await import('lightweight-charts'); // ⬅ unchanged
    
      if (cancelled || !containerRef.current) return;

      const chart = createChart(containerRef.current, {
        width: w,
        height: h,
        layout: { background: { color: colors.bg }, textColor: colors.text },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false, timeVisible: true, rightOffsetPixels: 25 },
        grid: {
          vertLines: { color: colors.grid, style: 1 },
          horzLines: { color: colors.grid, style: 1 },
        },
        crosshair: { mode: 0 },
      });
      chartRef.current = chart;

      const series = chart.addSeries(BarSeries,{
        upColor: colors.up,
        downColor: colors.down,
        priceLineVisible: false,
      });
      seriesRef.current = series;

      setChartReady(true); // ⬅ NOW the series is ready

      // keep chart width in sync
      const ro = new ResizeObserver(entries => {
        for (const e of entries) {
          const newW = Math.max(100, Math.floor(e.contentRect.width));
          chart.applyOptions({ width: newW });
          chart.timeScale().fitContent(); // ⬅ ensures first draw after width > 0
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
      if (chartRef.current) {
        chartRef.current.remove?.();
        chartRef.current = null;
        seriesRef.current = null;
      }
      setChartReady(false); // ⬅ reset on unmount
    };
  }, [height, colors]); // ⬅ deps untouched

  // Update theme colors dynamically
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;
    chartRef.current.applyOptions({
      layout: { background: { type: 'solid', color: colors.bg }, textColor: colors.text },
      grid: {
        vertLines: { color: colors.grid, style: 1 },
        horzLines: { color: colors.grid, style: 1 },
      },
    });
    // only bar-series options here
    seriesRef.current.applyOptions({
      upColor: colors.up,
      downColor: colors.down,
      priceLineVisible: false,
    });
  }, [colors]);

  // Set data
  useEffect(() => {
    if (!chartReady || !data?.data || !seriesRef.current) return; // ⬅ also wait for chartReady

    const formatted = data.data
      .filter((p: any) => p?.time && p.open != null && p.high != null && p.low != null && p.close != null)
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
  }, [data, chartReady]); // ⬅ chartReady added to deps

  return (
    <Card className="p-2">
      {showTitle && <div className="mb-1 text-sm font-semibold">{ticker}</div>}
      {/* ensure container has explicit height so it’s never 0 */}
      <div ref={containerRef} style={{ width: '100%', height }} />
      <div className="mt-2">
        <CommentBox watchlistItemId={watchlistItemId} />
      </div>
    </Card>
  );
}
