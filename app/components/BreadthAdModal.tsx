'use client';

import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

type SelectedAdState = {
  groupId: number;
  groupName: string;
} | null;

type AdTimePoint = {
  date: string;
  adv: number;
  dec: number;
  total: number;
};

type BreadthAdModalProps = {
  selected: SelectedAdState;
  onClose: () => void;
};

export function BreadthAdModal({ selected, onClose }: BreadthAdModalProps) {
  const [series, setSeries] = useState<AdTimePoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [windowPoints, setWindowPoints] = useState<number>(50);

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
          throw new Error('Failed to fetch breadth AD history');
        }
        const rows: AdTimePoint[] = await res.json();

        setSeries(rows);

        const defaultWindow = Math.min(50, rows.length || 0);
        setWindowPoints(defaultWindow || rows.length || 0);
      } catch (err) {
        console.error(err);
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
            label: 'Advances',
            data: visibleSeries.map((p) => p.adv),
            backgroundColor: 'rgba(34,197,94,0.7)', // emerald
            borderWidth: 0,
            type: 'bar' as const,
            order: 2,
            grouped: false,         // <--- add this
            barPercentage: 0.8,     // optional: control width
            categoryPercentage: 1.0 // optional
          },
          {
            label: 'Declines',
            data: visibleSeries.map((p) => -1 * p.dec),
            backgroundColor: 'rgba(244,63,94,0.7)', // rose
            borderWidth: 0,
            type: 'bar' as const,
            order: 2,
            grouped: false,         // <--- add this
            barPercentage: 0.8,
            categoryPercentage: 1.0
          },
          {
            label: 'A-D',
            data: visibleSeries.map((p) => p.adv - p.dec),
            type: 'line' as const,
            borderColor: 'rgba(129,140,248,1)',
            backgroundColor: 'rgba(129,140,248,0.15)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.25,
            order: 1,
          },
        ],
      }
    : null;


  const chartOptions: Parameters<typeof Bar>[0]['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#e4e4e7',
          font: { size: 10 },
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
            const v = ctx.parsed.y as number;
            const point = visibleSeries?.[ctx.dataIndex];
            const total = point?.total ?? 0;

            if (ctx.dataset.label === 'A-D') {
              const pct = total > 0 ? (v / total) * 100 : 0;
              return `A-D: ${v} (${pct.toFixed(1)}%)`;
            }

            // For bars: use magnitude for % (declines are negative in chart)
            const absV = Math.abs(v);
            const pct = total > 0 ? (absV / total) * 100 : 0;
            return `${ctx.dataset.label}: ${absV} (${pct.toFixed(1)}%)`;
          },
        },
      },
    datalabels: {display: false,},
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
        ticks: {
          color: '#a1a1aa',
          font: { size: 10 },
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
              Advances vs Declines – {selected.groupName}
            </h3>
            <p className="text-[11px] text-zinc-500">
              Advances, declines and A-D line over time
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

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

          {!loading && chartData && <Bar data={chartData} options={chartOptions} />}

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
