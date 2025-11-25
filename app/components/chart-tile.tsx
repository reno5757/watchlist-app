'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { useTheme } from 'next-themes';
import CommentBox from './comment-box';
import { BarSeries, LineSeries } from 'lightweight-charts';

import { AbsoluteStrengthBadgesForTicker } from '@/components/AbsoluteStrengthBadgesForTicker';
import { VolAdjustedAbsoluteStrengthBadgesForTicker} from '@/components/VolAdjustedAbsoluteStrengthBadgesForTicker';

type MovingAverageType = 'ema' | 'sma';

type MaLine = {
  id: string;
  type: MovingAverageType;
  length: number;
  color: string;
  visible: boolean;
};

type MaConfig = {
  ma_enabled: boolean;
  lines: MaLine[];
};

type Props = {
  ticker: string;
  watchlistItemId: number;
  days?: number;
  height?: number; // px
  showTitle?: boolean;

  // Global chart MA config (EMA/SMA)
  maConfig?: MaConfig;
};

type StockInfo = {
  id: number;
  ticker: string;
  name?: string | null;
  sector?: string | null;
  industry?: string | null;
};

const FETCH_DAYS = 1000;

// ⬇⬇⬇ EMA calculation on close prices
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

// ⬇⬇⬇ SMA calculation on close prices
function computeSMA(
  points: Array<{ time: any; close: number }>,
  length: number
): Array<{ time: any; value: number }> {
  if (!length || length <= 0 || points.length === 0) return [];

  const result: Array<{ time: any; value: number }> = [];
  let sum = 0;
  const window: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    sum += p.close;
    window.push(p.close);

    if (window.length > length) {
      sum -= window.shift()!;
    }

    if (window.length === length) {
      const avg = sum / length;
      result.push({ time: p.time, value: avg });
    }
  }

  return result;
}

// Generic MA dispatcher
function computeMA(
  points: Array<{ time: any; close: number }>,
  length: number,
  type: MovingAverageType
): Array<{ time: any; value: number }> {
  if (type === 'sma') return computeSMA(points, length);
  return computeEMA(points, length); // default / ema
}

export default function ChartTile({
  ticker,
  watchlistItemId,
  days = 180,
  height = 400,
  showTitle = true,
  maConfig, 
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const { theme } = useTheme();

  const [chartReady, setChartReady] = useState(false);

  // ⬇⬇⬇ MAs: keep references to MA line series by id
  const maSeriesRef = useRef<Record<string, any>>({});

  // OHLC fetch – always FETCH_DAYS, independent of selected window
  const { data } = useQuery({
    queryKey: ['ohlc', ticker], // days does NOT affect fetch now
    queryFn: async () => {
      const res = await fetch(
        `/api/ohlc?ticker=${encodeURIComponent(ticker)}&days=${FETCH_DAYS}`,
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

  // 🔹 Stock metadata: name, sector, industry
  const {
    data: stockInfo,
    isLoading: stockLoading,
    error: stockError,
  } = useQuery<StockInfo>({
    queryKey: ['stock-info', ticker],
    queryFn: async () => {
      // Adjust the URL if your route is different (e.g. /api/stocks-info/)
      const res = await fetch(`/api/stocks/${encodeURIComponent(ticker)}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to fetch stock info');
      return res.json();
    },
  });

  // Theme palette
  const colors = useMemo(() => {
    const dark = theme === 'dark' || theme === 'system';
    return {
      bg: 'transparent',
      text: !dark ? '#e5e7eb' : '#282829ff',
      grid: !dark ? '#282829ff' : '#e5e7eb',
      up: '#ffffff', // white bars
      down: '#ffffff', // white bars
      wick: !dark ? '#9ca3af' : '#6b7280',
    };
  }, [theme]);

  // Create chart on client, ensure non-zero container size first
  useEffect(() => {
    let cancelled = false;
    setChartReady(false);

    const init = async () => {
      if (!containerRef.current || chartRef.current) return;

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

      const { createChart, BarSeries, LineSeries } = await import(
        'lightweight-charts'
      );

      if (cancelled || !containerRef.current) return;

      const chart = createChart(containerRef.current, {
        width: w,
        height: h,
        layout: { background: { color: colors.bg }, textColor: colors.text },
        rightPriceScale: { borderVisible: false },
        timeScale: {
          borderVisible: false,
          timeVisible: false,
          rightOffsetPixels: 0,
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

      const ro = new ResizeObserver((entries) => {
        for (const e of entries) {
          const newW = Math.max(100, Math.floor(e.contentRect.width));
          chart.applyOptions({ width: newW });
          // chart.timeScale().fitContent();
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

      // Clear MA series handles on unmount
      maSeriesRef.current = {};

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

  // Set OHLC data (full 450d) and set visible time window according to `days`
  useEffect(() => {
    if (!chartReady || !data?.data || !seriesRef.current || !chartRef.current) {
      return;
    }

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

    if (formatted.length === 0) return;

    // Set full data for the bar series
    seriesRef.current.setData(formatted as any);

    // Set visible range based on `days`
    const totalBars = formatted.length;
    const barsToShow = Math.min(days, totalBars);
    const fromIndex = Math.max(0, totalBars - barsToShow);
    const toIndex = totalBars - 1;

    chartRef.current.timeScale().setVisibleLogicalRange({
      from: fromIndex,
      to: toIndex + Math.floor(days / 15),
    });
  }, [data, chartReady, days]);

  // ⬇⬇⬇ MAs: compute & draw EMA / SMA line series (full data, same timeScale window)
  useEffect(() => {
    if (
      !chartReady ||
      !data?.data ||
      !chartRef.current ||
      !maConfig ||
      !maConfig.ma_enabled
    ) {
      // If MAs are disabled, remove any existing MA series
      const existing = maSeriesRef.current;
      for (const id of Object.keys(existing)) {
        chartRef.current?.removeSeries?.(existing[id]);
      }
      maSeriesRef.current = {};
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
      const existing = maSeriesRef.current;
      for (const id of Object.keys(existing)) {
        chartRef.current?.removeSeries?.(existing[id]);
      }
      maSeriesRef.current = {};
      return;
    }

    const visibleLines =
      maConfig.lines?.filter(
        (l) =>
          l.visible &&
          typeof l.length === 'number' &&
          l.length > 0 &&
          (l.type === 'ema' || l.type === 'sma')
      ) ?? [];

    const existing = maSeriesRef.current;
    const activeIds = new Set(visibleLines.map((l) => l.id));

    // Remove MA series that are no longer active
    for (const id of Object.keys(existing)) {
      if (!activeIds.has(id)) {
        chartRef.current.removeSeries?.(existing[id]);
        delete existing[id];
      }
    }

    // Add / update series for each visible MA: full data
    for (const line of visibleLines) {
      let series = existing[line.id];
      if (!series) {
        series = chartRef.current.addSeries(LineSeries, {
          color: line.color,
          lineWidth: 0.5,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        existing[line.id] = series;
      } else {
        series.applyOptions({
          color: line.color,
        });
      }

      const maData = computeMA(raw, line.length, line.type);
      series.setData(maData as any);
    }
  }, [data, chartReady, maConfig]);

  // ⬇⬇⬇ Visible MA lines for title display
  const visibleMaLines: MaLine[] =
    maConfig && maConfig.ma_enabled && Array.isArray(maConfig.lines)
      ? maConfig.lines.filter(
          (l) =>
            l.visible &&
            typeof l.length === 'number' &&
            l.length > 0 &&
            (l.type === 'ema' || l.type === 'sma')
        )
      : [];

  return (
    <Card className="p-2">
      {showTitle && (
        <div className="mb-1 text-sm font-semibold">
          <span>{ticker}</span>
          {visibleMaLines.length > 0 && (
            <span
              style={{
                marginLeft: 8,
                fontSize: '0.75rem',
                fontWeight: 400,
              }}
            >
              {visibleMaLines.map((line, idx) => (
                <span key={line.id} style={{ color: line.color }}>
                  {idx > 0 && ' · '}
                  {line.type.toUpperCase()} {line.length}
                </span>
              ))}
            </span>
          )}

          {/* Name / sector / industry under the ticker */}
          {stockInfo && !stockError && (
            <div className="mt-0.5 text-[11px] font-normal text-muted-foreground">
              {stockInfo.name && (
                <div className="truncate">{stockInfo.name}</div>
              )}
              {(stockInfo.sector || stockInfo.industry) && (
                <div className="truncate">
                  {stockInfo.sector}
                  {stockInfo.sector && stockInfo.industry && ' · '}
                  {stockInfo.industry}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div ref={containerRef} style={{ width: '100%', height }} />

      {watchlistItemId !== undefined && (
        <>
          {/* AS badges */}
          <div className="mt-2">
            <AbsoluteStrengthBadgesForTicker ticker={ticker} />
            <VolAdjustedAbsoluteStrengthBadgesForTicker ticker={ticker} />
          </div>
          {/* Comment Box */}
          <div className="mt-2">
            <CommentBox watchlistItemId={watchlistItemId} />
          </div>
        </>
      )}
    </Card>
  );
}
