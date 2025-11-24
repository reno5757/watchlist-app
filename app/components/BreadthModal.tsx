'use client';

import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type MetricKey =
  | 'aboveMa5'
  | 'aboveMa10'
  | 'aboveMa20'
  | 'aboveMa50'
  | 'aboveMa200'
  | 'spikeUp'
  | 'spikeDown';

type TimePoint = {
  date: string;
  total: number;
  aboveMa5: number;
  aboveMa10: number;
  aboveMa20: number;
  aboveMa50: number;
  aboveMa200: number;
  spikeUp: number;
  spikeDown: number;
};

const METRIC_LABEL: Record<MetricKey, string> = {
  aboveMa5: '> MA5',
  aboveMa10: '> MA10',
  aboveMa20: '> MA20',
  aboveMa50: '> MA50',
  aboveMa200: '> MA200',
  spikeUp: 'Up On Volume',
  spikeDown: 'Down On Volume',
};

type SelectedState = {
  groupId: number;
  groupName: string;
  metric: MetricKey;
} | null;

type BreadthModalProps = {
  selected: SelectedState;
  onClose: () => void;
};

export function BreadthModal({ selected, onClose }: BreadthModalProps) {
  const [series, setSeries] = useState<{ date: string; value: number }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [windowPoints, setWindowPoints] = useState<number>(100); // number of points to show

  // Fetch history when a selection is provided
  useEffect(() => {
    if (!selected) {
      setSeries(null);
      return;
    }

    const fetchSeries = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/breadth/${selected.groupId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch breadth history');
        }
        const rows: TimePoint[] = await res.json();

        const metric = selected.metric;
        const transformed = rows.map((row) => {
          const value = row.total > 0 ? ((row[metric] as number) / row.total) * 100 : 0;
          return { date: row.date, value };
        });

        setSeries(transformed);

        // Default window: up to last 252 points (approx 1y) or full length if shorter
        const defaultWindow = Math.min(252, transformed.length || 0);
        setWindowPoints(defaultWindow || transformed.length || 0);
      } catch (e) {
        console.error(e);
        setSeries(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSeries();
  }, [selected]);

  if (!selected) return null;

  const totalPoints = series?.length ?? 0;
  const clampedWindow =
    totalPoints > 0 ? Math.min(Math.max(windowPoints, 1), totalPoints) : 0;

  const visibleSeries =
    series && totalPoints > 0
      ? series.slice(Math.max(0, totalPoints - clampedWindow))
      : null;

  const chartData =
    visibleSeries && visibleSeries.length > 0
      ? {
          labels: visibleSeries.map((p) => p.date),
          datasets: [
            {
              label: METRIC_LABEL[selected.metric],
              data: visibleSeries.map((p) => p.value),
              borderColor: 'rgb(34,197,94)', // emerald-500
              backgroundColor: 'rgba(34,197,94,0.15)',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.25,
            },
          ],
        }
      : null;

  const chartOptions: Parameters<typeof Line>[0]['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
        labels: {
          color: '#e4e4e7',
        },
      },
      tooltip: {
        backgroundColor: '#020617',
        borderColor: '#3f3f46',
        borderWidth: 1,
        titleColor: '#e4e4e7',
        bodyColor: '#e4e4e7',
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed.y;
            return `${v.toFixed(1)}%`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#a1a1aa',
          maxTicksLimit: 8,
          font: { size: 10 },
        },
        grid: {
          color: '#27272a',
        },
      },
      y: {
        min: 0,
        max: 100,
        ticks: {
          color: '#a1a1aa',
          font: { size: 10 },
          callback: (value) => `${value}%`,
        },
        grid: {
          color: '#27272a',
        },
      },
    },
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWindowPoints(Number(e.target.value));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl shadow-black/60">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              {METRIC_LABEL[selected.metric]} – {selected.groupName}
            </h3>
            <p className="text-[11px] text-zinc-500">
              Percentage of stocks in this group above this moving average over time
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

        {/* Time window slider */}
        {series && series.length > 0 && (
          <div className="mb-3 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>Time window</span>
              <span>
                Last{' '}
                <span className="font-semibold text-zinc-100">
                  {clampedWindow}
                </span>{' '}
                points (of {totalPoints})
              </span>
            </div>
            <input
              type="range"
              min={Math.min(30, totalPoints || 30)}
              max={totalPoints || 100}
              step={5}
              value={clampedWindow || 0}
              onChange={handleSliderChange}
              className="w-full accent-emerald-500"
            />
          </div>
        )}

        <div className="h-72 w-full">
          {loading && (
            <div className="flex h-full items-center justify-center text-xs text-zinc-500">
              Loading…
            </div>
          )}

          {!loading && chartData && (
            <Line data={chartData} options={chartOptions} />
          )}

          {!loading && !chartData && (
            <div className="flex h-full items-center justify-center text-xs text-zinc-500">
              No data available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
