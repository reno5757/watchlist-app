// components/WatchlistSortControls.tsx

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  METRIC_SORT_KEYS,
  SortKey,
  SortDirection,
} from '@/lib/watching-sorting';

type Props = {
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSortKeyChange: (value: SortKey) => void;
  onSortDirectionChange: (value: SortDirection) => void;
};

export default function WatchlistSortControls({
  sortKey,
  sortDirection,
  onSortKeyChange,
  onSortDirectionChange,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Sort by</span>

      {/* Sort key */}
      <Select
        value={sortKey}
        onValueChange={(v) => onSortKeyChange(v as SortKey)}
      >
        <SelectTrigger className="h-8 w-52 text-xs">
          <SelectValue placeholder="Sort key…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="saved">Saved order</SelectItem>
          <SelectItem value="ticker">Ticker</SelectItem>

          <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Returns
          </div>
          {METRIC_SORT_KEYS.filter((m) =>
            m.value.startsWith('return_') ||
            m.value === 'daily_return'
          ).map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}

          <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Trend
          </div>
          {METRIC_SORT_KEYS.filter((m) =>
            m.value.endsWith('_slope')
          ).map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}

          <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            52w distance
          </div>
          {METRIC_SORT_KEYS.filter((m) =>
            m.value.startsWith('dist_52w')
          ).map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}

          <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Drawdown (MDD)
          </div>
          {METRIC_SORT_KEYS.filter((m) =>
            m.value.startsWith('mdd_')
          ).map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}

          <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Absolute Strength (p-rank)
          </div>
          {METRIC_SORT_KEYS.filter((m) =>
            m.value.startsWith('as_')
          ).map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}

          <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Sortino-AS (p-rank)
          </div>
          {METRIC_SORT_KEYS.filter((m) =>
            m.value.startsWith('sortino_as_')
          ).map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Direction */}
      <Select
        value={sortDirection}
        onValueChange={(v) =>
          onSortDirectionChange(v as SortDirection)
        }
      >
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue placeholder="Order" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="desc">Descending</SelectItem>
          <SelectItem value="asc">Ascending</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
