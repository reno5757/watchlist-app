'use client';

import { useQuery } from '@tanstack/react-query';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Card } from '@/components/ui/card';

// Register radar chart pieces
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

type MetricsRow = {
  symbol: string;
  date: string;

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

type Props = {
  watchlistId: number;
};

function toNumber(v: number | null) {
  return v == null ? 0 : v;
}

export default function WatchlistRadar({ watchlistId }: Props) {
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
    return <p className="text-sm text-muted-foreground">Loading radar charts…</p>;
  }

  if (error || !data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">No metrics available.</p>;
  }

  const labels = ['1W','1M', '3M', '6M', '12M'];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
      {data.map((row) => {
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

        const chartData = {
          labels,
          datasets: [
            {
              label: 'Absolute AS',
              data: asData,
              borderColor: 'rgba(59, 130, 246, 1)',          // blue-500
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderWidth: 2,
              pointRadius: 2,
            },
            {
              label: 'Vol-adjusted AS',
              data: sortinoData,
              borderColor: 'rgba(16, 185, 129, 1)',          // emerald-500
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              borderWidth: 2,
              pointRadius: 2,
            },
          ],
        };

        const options = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position : 'bottom',
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
              color : '#ffffff'
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
          },
          scales: {
            r: {
              angleLines: { color: 'rgba(148, 163, 184, 0.3)' }, // slate-400/30
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

        return (
          <Card key={row.symbol} className="p-3">
            <div className="h-56">
              <Radar data={chartData} options={options} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
