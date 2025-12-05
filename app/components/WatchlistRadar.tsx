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
  name?: string;        // <-- added
  date: string;

  daily_return: number | null;
  return_5d: number | null;
  return_21d: number | null;
  return_63d: number | null;
  return_126d: number | null;
  return_252d: number | null;

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

type Props = {
  watchlist: WatchlistPayload;
};

function toNumber(v: number | null) {
  return v == null ? 0 : v;
}

function toPercent(v: number | null) {
  return v == null ? 0 : v * 100;
}

export default function WatchlistRadar({ watchlist }: Props) {
  const watchlistId = watchlist.id;
  const symbolsOrder = watchlist.items.map((i) => i.ticker);

  const { data, isLoading, error } = useQuery<MetricsRow[]>({
    queryKey: ['watchlist-metrics-radar-with-names', watchlistId],
    queryFn: async () => {
      // Fetch metrics
      const res = await fetch(`/api/watchlists/${watchlistId}/metrics`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load metrics');
      const metrics: MetricsRow[] = await res.json();

      // Fetch company name for each symbol
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

      // Merge name into metrics
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
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading radar charts…</p>;
  }

  if (error || !data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">No metrics available.</p>;
  }

  // Apply watchlist ticker order
  const indexMap = new Map<string, number>();
  symbolsOrder.forEach((sym, idx) => indexMap.set(sym, idx));

  const rows: MetricsRow[] = [...data].sort((a, b) => {
    const ia = indexMap.get(a.symbol) ?? Number.MAX_SAFE_INTEGER;
    const ib = indexMap.get(b.symbol) ?? Number.MAX_SAFE_INTEGER;
    return ia - ib;
  });

  const labels = ['1W', '1M', '3M', '6M', '12M'];
  const perfLabels = labels;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
      {rows.map((row) => {
        // ----- Radar data -----
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
              borderColor: 'rgba(59,130,246,1)',
              backgroundColor: 'rgba(59,130,246,0.25)',
              borderWidth: 2,
              pointRadius: 2,
            },
            {
              label: 'Vol-adjusted AS',
              data: sortinoData,
              borderColor: 'rgba(16,185,129,1)',
              backgroundColor: 'rgba(16,185,129,0.25)',
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
              labels: { boxWidth: 10, font: { size: 10 } },
            },
            title: {
              display: true,
              text: row.name ? `${row.name}\n(${row.symbol})` : row.symbol,
              padding: { top: 0, bottom: 4 },
              font: { size: 13 },
              color: '#ffffff',
            },
            datalabels: { display: false },
          },
          scales: {
            r: {
              min: 0,
              max: 100,
              ticks: { display: false },
              grid: { color: 'rgba(148,163,184,0.2)' },
              angleLines: { color: 'rgba(148,163,184,0.3)' },
              pointLabels: { font: { size: 10 } },
            },
          },
        } as const;

        // ----- Bar chart data -----
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
              backgroundColor: 'rgba(59,130,246,0.6)',
              borderColor: 'rgba(59,130,246,1)',
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
              color: '#e5e7eb',
              font: { size: 10 },
              formatter: (v: number) => `${v.toFixed(1)}%`,
            },
          },
          scales: {
            x: { ticks: { callback: (v: any) => `${v}%` } },
            y: { grid: { display: false } },
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
