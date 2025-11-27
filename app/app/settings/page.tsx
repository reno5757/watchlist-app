'use client';

import { useEffect, useState } from 'react';

type MovingAverageType = 'ema' | 'sma';

type ChartMaLine = {
  id: string;
  type: MovingAverageType;
  length: number;
  color: string;
  visible: boolean;
};

type ChartMaConfig = {
  ma_enabled: boolean;
  lines: ChartMaLine[];
};

export default function ChartMaSettingsPage() {
  const [config, setConfig] = useState<ChartMaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const res = await fetch('/api/settings/chart-ema', {
          method: 'GET',
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error(`Failed to load config (status ${res.status})`);
        }

        const data = (await res.json()) as ChartMaConfig;
        if (!cancelled) {
          setConfig(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message ?? 'Error loading config');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateLine(index: number, patch: Partial<ChartMaLine>) {
    if (!config) return;
    const newLines = [...config.lines];
    newLines[index] = { ...newLines[index], ...patch };
    setConfig({ ...config, lines: newLines });
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch('/api/settings/chart-ema', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Failed to save config (status ${res.status}): ${text}`
        );
      }

      const data = (await res.json()) as ChartMaConfig;
      setConfig(data);
      setMessage('Settings saved successfully.');
    } catch (err: any) {
      setError(err.message ?? 'Error saving settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading chart MA settings…</p>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="bg-zinc-950 border border-red-500/40 px-4 py-3 rounded-xl max-w-md w-full">
          <p className="text-sm text-red-300 font-medium">Error</p>
          <p className="text-sm text-zinc-100 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex justify-center px-4 py-10">
      <div className="w-full max-w-3xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Chart Moving Averages
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure EMA/SMA overlays used on your price charts.
          </p>
        </header>

        <div className="space-y-6">
          {/* Global toggle */}
          <div className="bg-zinc-950/40 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-100">
                Enable Chart Moving Averages
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                When disabled, no MA lines will be drawn on the chart.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-muted-foreground">
                {config.ma_enabled ? 'On' : 'Off'}
              </span>
              <input
                type="checkbox"
                className="sr-only"
                checked={config.ma_enabled}
                onChange={(e) =>
                  setConfig({ ...config, ma_enabled: e.target.checked })
                }
              />
              <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-zinc-800">
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-zinc-200 transform transition ${
                    config.ma_enabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </span>
            </label>
          </div>

          {/* Lines table */}
          <div className="bg-zinc-950/40 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-zinc-100">
                Moving Average Lines
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Edit type, length, color and visibility for each line.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border-separate border-spacing-y-1">
                <thead>
                  <tr className="text-[11px] text-muted-foreground">
                    <th className="text-left px-2 py-1">ID</th>
                    <th className="text-left px-2 py-1">Type</th>
                    <th className="text-left px-2 py-1">Length</th>
                    <th className="text-left px-2 py-1">Color</th>
                    <th className="text-left px-2 py-1">Visible</th>
                  </tr>
                </thead>
                <tbody>
                  {config.lines.map((line, idx) => (
                    <tr key={line.id} className="align-middle">
                      <td className="px-2 py-1">
                        <span className="inline-flex text-[11px] px-2 py-1 rounded-full bg-zinc-900 text-zinc-100">
                          Moving Average {idx+1}
                        </span>
                      </td>
                      <td className="px-2 py-1">
                        <select
                          className="bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          value={line.type}
                          onChange={(e) =>
                            updateLine(idx, {
                              type: e.target.value as MovingAverageType,
                              id: `${e.target.value}${line.length}`,
                            })
                          }
                        >
                          <option value="ema">EMA</option>
                          <option value="sma">SMA</option>
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          min={1}
                          className="w-20 bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          value={line.length}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (Number.isNaN(val) || val <= 0) return;
                            updateLine(idx, {
                              length: val,
                              id: `${line.type}${val}`,
                            });
                          }}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            className="h-6 w-10 rounded-md border-zinc-700 bg-zinc-950"
                            value={line.color}
                            onChange={(e) =>
                              updateLine(idx, { color: e.target.value })
                            }
                          />
                          <input
                            type="text"
                            className="w-24 bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-zinc-400"
                            value={line.color}
                            onChange={(e) =>
                              updateLine(idx, { color: e.target.value })
                            }
                          />
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-3 w-3 rounded border-zinc-600 bg-zinc-950"
                            checked={line.visible}
                            onChange={(e) =>
                              updateLine(idx, { visible: e.target.checked })
                            }
                          />
                          <span className="text-[11px] text-zinc-300">
                            {line.visible ? 'Shown' : 'Hidden'}
                          </span>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(message || error) && (
              <div className="mt-3 text-xs">
                {message && (
                  <p className="text-emerald-400">{message}</p>
                )}
                {error && (
                  <p className="text-red-400">{error}</p>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
