// lib/watchlists/sorting.ts

export type MetricsRow = {
  symbol: string;
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

export type SortDirection = 'asc' | 'desc';

export const METRIC_SORT_KEYS = [
  { value: 'daily_return', label: 'Daily return' },
  { value: 'return_5d', label: '5d return' },
  { value: 'return_21d', label: '21d return' },
  { value: 'return_63d', label: '63d return' },
  { value: 'return_126d', label: '126d return' },
  { value: 'return_252d', label: '252d return' },

  { value: 'ma10_slope', label: 'MA10 slope' },
  { value: 'ma20_slope', label: 'MA20 slope' },
  { value: 'ma50_slope', label: 'MA50 slope' },
  { value: 'ma200_slope', label: 'MA200 slope' },

  { value: 'dist_52w_high', label: 'Distance to 52w high' },
  { value: 'dist_52w_low', label: 'Distance to 52w low' },

  { value: 'mdd_1w', label: 'MDD 1w' },
  { value: 'mdd_1m', label: 'MDD 1m' },
  { value: 'mdd_3m', label: 'MDD 3m' },
  { value: 'mdd_6m', label: 'MDD 6m' },
  { value: 'mdd_12m', label: 'MDD 12m' },

  { value: 'as_1w_prank', label: 'AS 1w (p-rank)' },
  { value: 'as_1m_prank', label: 'AS 1m (p-rank)' },
  { value: 'as_3m_prank', label: 'AS 3m (p-rank)' },
  { value: 'as_6m_prank', label: 'AS 6m (p-rank)' },
  { value: 'as_12m_prank', label: 'AS 12m (p-rank)' },

  { value: 'sortino_as_1w_prank', label: 'Sortino-AS 1w (p-rank)' },
  { value: 'sortino_as_1m_prank', label: 'Sortino-AS 1m (p-rank)' },
  { value: 'sortino_as_3m_prank', label: 'Sortino-AS 3m (p-rank)' },
  { value: 'sortino_as_6m_prank', label: 'Sortino-AS 6m (p-rank)' },
  { value: 'sortino_as_12m_prank', label: 'Sortino-AS 12m (p-rank)' },
] as const;

export type MetricSortKey = (typeof METRIC_SORT_KEYS)[number]['value'];

export type SortKey = 'saved' | 'ticker' | MetricSortKey;

export const ALL_SORT_KEYS: SortKey[] = [
  'saved',
  'ticker',
  ...METRIC_SORT_KEYS.map((m) => m.value),
];

export type WatchlistItemRow = {
  item_id: number;
  ticker: string;
  subcategory: string | null;
};

export type WatchlistPayload = {
  id: number;
  title: string;
  intro: string | null;
  default_sort: string | null;
  group_by_subcategory: 0 | 1;
  items: WatchlistItemRow[];
};

export function getMetricValue(
  metric: MetricsRow | undefined,
  key: MetricSortKey
): number | null {
  if (!metric) return null;
  return metric[key] ?? null;
}

export function sortItems(
  data: WatchlistPayload,
  sortKey: SortKey,
  direction: SortDirection,
  metricsMap: Map<string, MetricsRow>
): WatchlistItemRow[] {
  const items = [...data.items];

  if (sortKey === 'saved') {
    return items;
  }

  if (sortKey === 'ticker') {
    items.sort((a, b) => {
      const cmp = a.ticker.localeCompare(b.ticker, 'en', {
        sensitivity: 'base',
      });
      return direction === 'asc' ? cmp : -cmp;
    });
    return items;
  }

  const metricKey = sortKey as MetricSortKey;

  items.sort((a, b) => {
    const ma = metricsMap.get(a.ticker);
    const mb = metricsMap.get(b.ticker);

    const va = getMetricValue(ma, metricKey);
    const vb = getMetricValue(mb, metricKey);

    const aVal =
      va ?? (direction === 'asc'
        ? Number.POSITIVE_INFINITY
        : Number.NEGATIVE_INFINITY);
    const bVal =
      vb ?? (direction === 'asc'
        ? Number.POSITIVE_INFINITY
        : Number.NEGATIVE_INFINITY);

    if (aVal === bVal) {
      return a.ticker.localeCompare(b.ticker, 'en', {
        sensitivity: 'base',
      });
    }

    return direction === 'asc' ? aVal - bVal : bVal - aVal;
  });

  return items;
}

export function parseDefaultSort(
  value: string | null | undefined
): { key: SortKey; direction: SortDirection } {
  if (!value) {
    return { key: 'saved', direction: 'desc' };
  }

  if (value === 'ticker_asc') {
    return { key: 'ticker', direction: 'asc' };
  }

  const parts = value.split('_');
  const maybeDirection = parts[parts.length - 1];
  let direction: SortDirection =
    maybeDirection === 'asc' ? 'asc' : 'desc';

  let keyStr = value;
  if (maybeDirection === 'asc' || maybeDirection === 'desc') {
    keyStr = parts.slice(0, -1).join('_');
  }

  if (!ALL_SORT_KEYS.includes(keyStr as SortKey)) {
    return { key: 'saved', direction: 'desc' };
  }

  const key = keyStr as SortKey;
  if (key === 'saved') {
    direction = 'desc';
  }

  return { key, direction };
}
