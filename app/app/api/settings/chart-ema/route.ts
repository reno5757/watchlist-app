// app/api/chart-ma-config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAppDb } from '@/lib/db-app';

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

// Default: EMA-only, but with type = "ema"
const DEFAULT_MA_CONFIG: ChartMaConfig = {
  ma_enabled: true,
  lines: [
    { id: 'ema20', type: 'ema', length: 20, color: '#f97316', visible: true },   // orange-ish
    { id: 'ema50', type: 'ema', length: 50, color: '#22c55e', visible: true },   // green-ish
    { id: 'ema200', type: 'ema', length: 200, color: '#60a5fa', visible: true }, // blue-ish
  ],
};

// Keep the same key so existing DB rows are reused
const SETTINGS_KEY = 'chart_ma_config';

function parseConfig(value: string | null | undefined): ChartMaConfig {
  if (!value) return DEFAULT_MA_CONFIG;

  try {
    const parsed = JSON.parse(value);

    if (typeof parsed !== 'object' || parsed === null) {
      return DEFAULT_MA_CONFIG;
    }

    // Support both legacy "emas_enabled" and new "ma_enabled"
    const ma_enabled =
      typeof (parsed as any).ma_enabled === 'boolean'
        ? (parsed as any).ma_enabled
        : typeof (parsed as any).emas_enabled === 'boolean'
        ? (parsed as any).emas_enabled
        : DEFAULT_MA_CONFIG.ma_enabled;

    const linesRaw = Array.isArray((parsed as any).lines)
      ? (parsed as any).lines
      : DEFAULT_MA_CONFIG.lines;

    const lines: ChartMaLine[] = linesRaw
      .map((l: any, idx: number): ChartMaLine | null => {
        const length =
          typeof l.length === 'number' && l.length > 0 ? l.length : null;

        const color =
          typeof l.color === 'string' && l.color.trim() !== ''
            ? l.color
            : '#ffffff';

        const visible =
          typeof l.visible === 'boolean' ? l.visible : true;

        // Accept explicit type if valid, otherwise default legacy configs to "ema"
        const type: MovingAverageType =
          l.type === 'sma' || l.type === 'ema' ? l.type : 'ema';

        const idBase =
          typeof l.id === 'string' && l.id.trim() !== ''
            ? l.id
            : `${type}${length ?? idx}`;

        if (!length) return null;

        return {
          id: idBase,
          type,
          length,
          color,
          visible,
        };
      })
      .filter((l): l is ChartMaLine => l !== null);

    return {
      ma_enabled,
      lines: lines.length > 0 ? lines : DEFAULT_MA_CONFIG.lines,
    };
  } catch {
    return DEFAULT_MA_CONFIG;
  }
}

export async function GET(_req: NextRequest) {
  const db = getAppDb();

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
    const normalizedJson = JSON.stringify(config);
    if (normalizedJson !== row.value) {
      db.prepare(
        'UPDATE app_settings SET value = ? WHERE key = ?'
      ).run(normalizedJson, SETTINGS_KEY);
    }
  }

  // frontend receives: { ma_enabled, lines: [{ id, type, length, color, visible }] }
  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Reuse the same normalization / fallback logic as GET:
  // stringify the body and feed it through parseConfig.
  const config = parseConfig(JSON.stringify(body));

  const db = getAppDb();
  db.prepare(
    `
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `
  ).run(SETTINGS_KEY, JSON.stringify(config));

  return NextResponse.json(config);
}
