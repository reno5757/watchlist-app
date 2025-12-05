'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Title,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend, Title);

/* -----------------------------
   Ticker label plugin
-------------------------------- */
const TickerLabelPlugin = {
  id: 'tickerLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;

    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      meta.data.forEach((point, index) => {
        const raw = dataset.data[index];
        if (!raw?.symbol) return;

        ctx.save();
        ctx.font = '10px sans-serif';
        ctx.fillStyle = 'rgb(59,130,246)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(raw.symbol, point.x, point.y - 6);
        ctx.restore();
      });
    });
  },
};

ChartJS.register(TickerLabelPlugin);

/* -----------------------------
   Types
-------------------------------- */

type MetricsRow = {
  symbol: string;
  name?: string;                 // <-- ADDED
  date: string;

  daily_return: number | null;
  return_5d: number | null;
  return_21d: number | null;
  return_63d: number | null;
  return_126d: number | null;
  return_252d: number | null;

  ma10_slope: number | null;
  ma20_slope: number | null;
  ma50_slope: number | null;
  ma200_slope: number | null;

  dist_52w_high: number | null;
  dist_52w_low: number | null;

  mdd_1w: number | null;
  mdd_1m: number | null;
  mdd_3m: number | null;
  mdd_6m: number | null;
  mdd_12m: number | null;

  as_1w_prank: number | null;
  as_1m_prank: number | null;
  as_3m_prank: number | null;
  as_6m_prank: number | null;
  as_12m_prank: number | null;

  sortino_as_1w_prank: number | null;
  sortino_as_1m_prank: number | null;
  sortino_as_3m_prank: number | null;
  sortino_as_6m_prank: number | null;
  sortino_as_12m_prank: number | null;
};

type StockInfo = {
  symbol: string;
  name?: string;
  shortName?: string;
  longName?: string;
  companyName?: string;
};

type TimeframeKey = '1w' | '1m' | '3m' | '6m' | '12m';

const TIMEFRAMES = [
  { key: '1w', label: '1 week',  returnKey: 'return_5d',  mddKey: 'mdd_1w' },
  { key: '1m', label: '1 month', returnKey: 'return_21d', mddKey: 'mdd_1m' },
  { key: '3m', label: '3 months', returnKey: 'return_63d', mddKey: 'mdd_3m' },
  { key: '6m', label: '6 months', returnKey: 'return_126d', mddKey: 'mdd_6m' },
  { key: '12m', label: '12 months', returnKey: 'return_252d', mddKey: 'mdd_12m' },
];

/* -----------------------------
   Component
-------------------------------- */

export default function WatchlistDrawdownVsReturnChart({ watchlistId }: { watchlistId: number }) {
  const [timeframe, setTimeframe] = useState<TimeframeKey>('3m');

  const { data, isLoading, error } = useQuery<MetricsRow[]>({
    queryKey: ['watchlist-metrics-with-names', watchlistId],
    queryFn: async () => {
      // fetch metrics
      const res = await fetch(`/api/watchlists/${watchlistId}/metrics`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const metrics: MetricsRow[] = await res.json();

      // fetch company names
      const infos = await Promise.all(
        metrics.map(async (row) => {
          try {
            const r = await fetch(`/api/stocks/${row.symbol}`, {
              cache: 'no-store',
            });
            if (!r.ok) return null;
            return (await r.json()) as StockInfo;
          } catch {
            return null;
          }
        })
      );

      // merge names
      return metrics.map((row, i) => {
        const info = infos[i];
        const name =
          info?.name ??
          info?.shortName ??
          info?.longName ??
          info?.companyName ??
          undefined;

        return { ...row, name };
      });
    },
    staleTime: 60_000,
  });

  const selectedConfig = TIMEFRAMES.find((tf) => tf.key === timeframe)!;

  const chartData = useMemo(() => {
    if (!data) return { datasets: [] };

    const { returnKey, mddKey } = selectedConfig;

    const points = data
      .map((row) => {
        const ret = row[returnKey] as number | null;
        const mdd = row[mddKey] as number | null;
        if (ret == null || mdd == null) return null;

        return {
          x: ret * 100,
          y: -mdd * 100,
          symbol: row.symbol,
          name: row.name,     // <-- added for tooltip
        };
      })
      .filter(Boolean);

    return {
      datasets: [{
        label: `${selectedConfig.label} return vs max drawdown`,
        data: points,
        pointRadius: 6,
        pointBackgroundColor: 'rgb(59,130,246)',
        pointBorderColor: 'rgb(30,58,138)',
        pointBorderWidth: 2,
      }],
    };
  }, [data, selectedConfig]);

  const options: ChartOptions<'scatter'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `${selectedConfig.label} – Return vs Max Drawdown`,
        },
        tooltip: {
          callbacks: {
            label: (ctx: TooltipItem<'scatter'>) => {
              const raw = ctx.raw as any;
              const title = raw.name
                ? `${raw.symbol} – ${raw.name}`
                : raw.symbol;

              return `${title}: Return ${raw.x.toFixed(2)}%, MaxDD ${raw.y.toFixed(2)}%`;
            },
          },
        },
        datalabels: { display: false },

      },
      scales: {
        x: {
          grid: {
            color: (ctx) =>
              ctx.tick.value === 0
                ? 'rgba(255, 255, 255, 0.9)'      // <-- white zero line
                : 'rgba(128,128,128,0.3)',
            lineWidth: (ctx) => (ctx.tick.value === 0 ? 1.2 : 1),
          },
          title: { display: true, text: 'Return (%)' },
          ticks: { callback: (v) => `${v}%` },
        },
        y: {
          grid: {
            color: (ctx) =>
              ctx.tick.value === 0
                ? 'rgba(255,255,255,0.9)'         // <-- white zero line
                : 'rgba(128,128,128,0.3)',
            lineWidth: (ctx) => (ctx.tick.value === 0 ? 1.2 : 1),
          },
          title: { display: true, text: 'Max drawdown (%)' },
          ticks: { callback: (v) => `${v}%` },
        },
      }

    }),
    [selectedConfig]
  );

  if (isLoading) return <div>Loading chart…</div>;
  if (error) return <div>Error loading chart.</div>;
  if (!data?.length) return <div>No metrics available.</div>;

  return (
    <Card className="w-full h-[450px] flex flex-col">
      <CardHeader className="relative pb-2">
        <CardTitle className="absolute left-1/2 -translate-x-1/2 text-base">
          Return vs Max Drawdown
        </CardTitle>

        <div className="ml-auto">
          <Select value={timeframe} onValueChange={(v) => setTimeframe(v as TimeframeKey)}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              {TIMEFRAMES.map((tf) => (
                <SelectItem key={tf.key} value={tf.key}>
                  {tf.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <Scatter data={chartData} options={options} />
      </CardContent>
    </Card>
  );
}
