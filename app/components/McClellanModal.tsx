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
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

type SelectedMcState = {
  groupId: number;
  groupName: string;
} | null;

type McTimePoint = {
  date: string;
  mcclellan: number;
};

type McClellanModalProps = {
  selected: SelectedMcState;
  onClose: () => void;
};

export function McClellanModal({ selected, onClose }: McClellanModalProps) {
  const [series, setSeries] = useState<McTimePoint[] | null>(null);
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
          throw new Error('Failed to fetch McClellan history');
        }
        const rows: (McTimePoint & { mcclellan?: number })[] = await res.json();

        // Keep only rows that actually have mcclellan
        const filtered = rows
          .filter((r) => typeof r.mcclellan === 'number')
          .map((r) => ({
            date: r.date,
            mcclellan: r.mcclellan as number,
          }));

        setSeries(filtered);

        const def = Math.min(200, filtered.length || 0);
        setWindowPoints(def || filtered.length || 0);
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

  // Build summation index + MA10 over the FULL series, then slice
  let visibleSummation: number[] = [];
  let visibleSummationMa10: number[] = [];
  if (series && series.length > 0) {
    const fullSummation: number[] = [];
    for (let i = 0; i < series.length; i++) {
      const prev = i === 0 ? 0 : fullSummation[i - 1];
      fullSummation.push(prev + series[i].mcclellan);
    }

    const maPeriod = 10;
    const fullMa10: number[] = fullSummation.map((_, idx) => {
      const start = Math.max(0, idx - maPeriod + 1);
      const slice = fullSummation.slice(start, idx + 1);
      if (slice.length === 0) return NaN;
      const sum = slice.reduce((acc, v) => acc + v, 0);
      return sum / slice.length;
    });

    const startIndex = Math.max(0, totalPoints - clampedWindow);
    visibleSummation = fullSummation.slice(startIndex);
    visibleSummationMa10 = fullMa10.slice(startIndex);
  }

  const lineData =
    visibleSeries && visibleSeries.length > 0
      ? {
          labels: visibleSeries.map((p) => p.date),
          datasets: [
            {
              label: 'McClellan Summation Index',
              data: visibleSummation,
              type: 'line' as const,
              borderColor: 'rgba(34,197,94,1)', // default emerald
              backgroundColor: 'rgba(34,197,94,0.05)',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.25,
              // Color segments by slope: green up, red down
              segment: {
                borderColor: (ctx: any) => {
                  const p0 = ctx.p0?.parsed?.y;
                  const p1 = ctx.p1?.parsed?.y;
                  if (p0 == null || p1 == null) return 'rgba(34,197,94,1)';
                  return p1 > p0
                    ? 'rgba(34,197,94,1)' // up: emerald
                    : 'rgba(248,113,113,1)'; // down: red-400
                },
              } as any,
            },
            {
              label: 'MA10 (Summation)',
              data: visibleSummationMa10,
              type: 'line' as const,
              borderColor: 'rgba(129,140,248,1)', // indigo
              backgroundColor: 'rgba(129,140,248,0.1)',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.25,
            },
          ],
        }
      : null;

    const barData =
    visibleSeries && visibleSeries.length > 0
        ? {
            labels: visibleSeries.map((p) => p.date),
            datasets: [
            {
                label: 'McClellan Oscillator',
                data: visibleSeries.map((p) => p.mcclellan),
                type: 'bar' as const,
                borderWidth: 0,
                // color each bar by sign
                backgroundColor: (ctx: any) => {
                const value = ctx.raw as number;
                if (value > 0) {
                    return 'rgba(34,197,94,0.8)'; // green-ish
                }
                if (value < 0) {
                    return 'rgba(248,113,113,0.8)'; // red-ish
                }
                return 'rgba(148,163,184,0.8)'; // neutral grey for zero
                },
            },
            ],
        }
        : null;


  const lineOptions: Parameters<typeof Line>[0]['options'] = {
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

  const barOptions: Parameters<typeof Bar>[0]['options'] = {
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
              McClellan – {selected.groupName}
            </h3>
            <p className="text-[11px] text-zinc-500">
              Summation index (with MA10) and McClellan oscillator over time
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

        <div className="flex flex-col gap-4">
          {/* Top chart: 2x height */}
          <div className="h-80 w-full">
            {loading && (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                Loading…
              </div>
            )}

            {!loading && lineData && <Line data={lineData} options={lineOptions} />}

            {!loading && !lineData && (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                No data available.
              </div>
            )}
          </div>

          {/* Bottom chart: half the height */}
          <div className="h-40 w-full">
            {!loading && barData && <Bar data={barData} options={barOptions} />}

            {!loading && !barData && (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                No data available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
