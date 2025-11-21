'use client';

import { useQuery } from '@tanstack/react-query';
import { Radar, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Card } from '@/components/ui/card';
import type { WatchlistPayload } from '@/lib/watching-sorting';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register radar + bar chart pieces
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ChartDataLabels
);

type MetricsRow = {
  symbol: string;
  date: string;

  // returns (fractions, e.g. 0.12 for +12%)
  daily_return: number | null;
  return_5d: number | null;
  return_21d: number | null;
  return_63d: number | null;
  return_126d: number | null;
  return_252d: number | null;

  // AS p-ranks
  as_1w_prank: number | null;
  as_1m_prank: number | null;
  as_3m_prank: number | null;
  as_6m_prank: number | null;
  as_12m_prank: number | null;

  // Sortino-AS p-ranks
  sortino_as_1w_prank: number | null;
  sortino_as_1m_prank: number | null;
  sortino_as_3m_prank: number | null;
  sortino_as_6m_prank: number | null;
  sortino_as_12m_prank: number | null;
};

type Props = {
  watchlist: WatchlistPayload;
};

function toNumber(v: number | null) {
  return v == null ? 0 : v;
}

// convert fractional return (0.12) to percent (12)
function toPercent(v: number | null) {
  return v == null ? 0 : v * 100;
}

export default function WatchlistRadar({ watchlist }: Props) {
  const watchlistId = watchlist.id;
  const symbolsOrder = watchlist.items.map((i) => i.ticker);

  const { data, isLoading, error } = useQuery<MetricsRow[]>({
    queryKey: ['watchlist-metrics-radar', watchlistId],
    queryFn: async () => {
      const res = await fetch(`/api/watchlists/${watchlistId}/metrics`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load metrics');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading radar charts…
      </p>
    );
  }

  if (error || !data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No metrics available.
      </p>
    );
  }

  // Apply watchlist ticker order
  const indexMap = new Map<string, number>();
  symbolsOrder.forEach((sym, idx) => indexMap.set(sym, idx));

  const rows: MetricsRow[] = [...data].sort((a, b) => {
    const ia = indexMap.get(a.symbol) ?? Number.MAX_SAFE_INTEGER;
    const ib = indexMap.get(b.symbol) ?? Number.MAX_SAFE_INTEGER;
    return ia - ib;
  });

  const labels = ['1W', '1M', '3M', '6M', '12M']; // for radar
  const perfLabels = labels; // same buckets for the bar chart

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
      {rows.map((row) => {
        // ----- Radar data (AS & Sortino-AS p-ranks) -----
        const asData = [
          toNumber(row.as_1w_prank),
          toNumber(row.as_1m_prank),
          toNumber(row.as_3m_prank),
          toNumber(row.as_6m_prank),
          toNumber(row.as_12m_prank),
        ];

        const sortinoData = [
          toNumber(row.sortino_as_1w_prank),
          toNumber(row.sortino_as_1m_prank),
          toNumber(row.sortino_as_3m_prank),
          toNumber(row.sortino_as_6m_prank),
          toNumber(row.sortino_as_12m_prank),
        ];

        const radarData = {
          labels,
          datasets: [
            {
              label: 'Absolute AS',
              data: asData,
              borderColor: 'rgba(59, 130, 246, 1)', // blue-500
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderWidth: 2,
              pointRadius: 2,
            },
            {
              label: 'Vol-adjusted AS',
              data: sortinoData,
              borderColor: 'rgba(16, 185, 129, 1)', // emerald-500
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              borderWidth: 2,
              pointRadius: 2,
            },
          ],
        };

        const radarOptions = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                boxWidth: 10,
                font: { size: 10 },
              },
            },
            title: {
              display: true,
              text: row.symbol,
              padding: { top: 0, bottom: 4 },
              font: { size: 14 },
              color: '#ffffff',
            },
            tooltip: {
              callbacks: {
                label: (ctx: any) => {
                  const label = ctx.dataset.label || '';
                  const value = ctx.parsed.r ?? 0;
                  return `${label}: ${Math.round(value)}`;
                },
              },
            },
            datalabels: {display: false,},
          },
          scales: {
            r: {
              angleLines: { color: 'rgba(148, 163, 184, 0.3)' },
              grid: { color: 'rgba(148, 163, 184, 0.2)' },
              min: 0,
              max: 100,
              ticks: {
                display: false,
                stepSize: 20,
                backdropColor: 'transparent',
                font: { size: 9 },
              },
              pointLabels: {
                font: { size: 10 },
              },
            },
          },
        
        } as const;

        // ----- Horizontal bar data (performance in %) -----
        const perfData = [
          toPercent(row.return_5d),
          toPercent(row.return_21d),
          toPercent(row.return_63d),
          toPercent(row.return_126d),
          toPercent(row.return_252d),
        ];

        const perfChartData = {
          labels: perfLabels,
          datasets: [
            {
              label: 'Performance (%)',
              data: perfData,
              backgroundColor: 'rgba(59, 130, 246, 0.6)',
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        };

        const perfOptions = {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y' as const,
          plugins: {
            legend: { display: false },

          datalabels: {
            anchor: 'end',
            align: 'right',
            color: (ctx: any) => {
              const v = ctx?.dataset?.data?.[ctx.dataIndex] ?? 0;
              if (v > 0) return '#5969f8ff';   // green
              if (v < 0) return '#ec5affff';   // red
              return '#e5e7eb';              // neutral
            },
            font: { size: 10 },
            formatter: (value: any) => `${Number(value).toFixed(1)}%`,
            clamp: true,
          },
            tooltip: {
              callbacks: {
                label: (ctx: any) => {
                  const label = ctx.label || '';
                  const value = ctx.parsed.x ?? 0;
                  return `${label}: ${value.toFixed(1)}%`;
                },
              },
            },
          },
          scales: {
            x: {
              ticks: {
                callback: (val: any) => `${val}%`,
                font: { size: 9 },
              },
              grid: { color: 'rgba(148, 163, 184, 0.15)' },
            },
            y: {
              ticks: { font: { size: 9 } },
              grid: { display: false },
            },
          },
        };

        return (
          <Card key={row.symbol} className="p-3">
            <div className="h-56">
              <Radar data={radarData} options={radarOptions} />
            </div>
            <div className="mt-3 h-28">
              <Bar data={perfChartData} options={perfOptions} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
