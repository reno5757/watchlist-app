import { NextRequest, NextResponse } from 'next/server';
import { getAppDb } from '@/lib/db-app';

type ChartEmaLine = {
  id: string;
  length: number;
  color: string;
  visible: boolean;
};

type ChartEmaConfig = {
  emas_enabled: boolean;
  lines: ChartEmaLine[];
};

const DEFAULT_EMA_CONFIG: ChartEmaConfig = {
  emas_enabled: true,
  lines: [
    { id: 'ema20', length: 20, color: '#f97316', visible: true },  // orange-ish
    { id: 'ema50', length: 50, color: '#22c55e', visible: true },  // green-ish
    { id: 'ema200', length: 200, color: '#60a5fa', visible: true } // blue-ish
  ],
};

const SETTINGS_KEY = 'chart_ema_config';

function parseConfig(value: string | null | undefined): ChartEmaConfig {
  if (!value) return DEFAULT_EMA_CONFIG;

  try {
    const parsed = JSON.parse(value);

    // Very light validation / normalization
    if (typeof parsed !== 'object' || parsed === null) {
      return DEFAULT_EMA_CONFIG;
    }

    const emas_enabled =
      typeof (parsed as any).emas_enabled === 'boolean'
        ? (parsed as any).emas_enabled
        : DEFAULT_EMA_CONFIG.emas_enabled;

    const linesRaw = Array.isArray((parsed as any).lines)
      ? (parsed as any).lines
      : DEFAULT_EMA_CONFIG.lines;

    const lines: ChartEmaLine[] = linesRaw
      .map((l: any, idx: number): ChartEmaLine | null => {
        const length =
          typeof l.length === 'number' && l.length > 0 ? l.length : null;
        const color =
          typeof l.color === 'string' && l.color.trim() !== ''
            ? l.color
            : '#ffffff';
        const visible =
          typeof l.visible === 'boolean' ? l.visible : true;
        const id =
          typeof l.id === 'string' && l.id.trim() !== ''
            ? l.id
            : `ema${length ?? idx}`;

        if (!length) return null;

        return { id, length, color, visible };
      })
      .filter((l): l is ChartEmaLine => l !== null);

    return {
      emas_enabled,
      lines: lines.length > 0 ? lines : DEFAULT_EMA_CONFIG.lines,
    };
  } catch {
    return DEFAULT_EMA_CONFIG;
  }
}

export async function GET(_req: NextRequest) {
  const db = getAppDb();

  // Try to read existing setting
  const row = db
    .prepare<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?'
    )
    .get(SETTINGS_KEY);

  const config = parseConfig(row?.value);

  // If there was no row, or we had to fall back, persist the normalized config
  if (!row) {
    db.prepare(
      'INSERT INTO app_settings (key, value) VALUES (?, ?)'
    ).run(SETTINGS_KEY, JSON.stringify(config));
  } else {
    // Optional: keep it normalized if JSON was malformed / incomplete
    const normalizedJson = JSON.stringify(config);
    if (normalizedJson !== row.value) {
      db.prepare(
        'UPDATE app_settings SET value = ? WHERE key = ?'
      ).run(normalizedJson, SETTINGS_KEY);
    }
  }

  return NextResponse.json(config);
}
