'use client';

import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

function fmt(v: number | null | undefined) {
  if (v == null) return "-";
  return Math.round(v);
}

export function AbsoluteStrengthBadgesForTicker({ ticker }: { ticker: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['metrics', ticker],
    queryFn: async () => {
      const res = await fetch(`/api/metrics?ticker=${ticker}`);
      if (!res.ok) throw new Error("Failed to load metrics");
      return res.json();
    }
  });

  if (isLoading || !data) {
    return <div className="text-xs text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-xs text-muted-foreground mr-1">
        Absolute AS:
      </span>

      <Badge variant="outline" className="px-2 py-0.5 text-[10px]">
        1M {fmt(data.as_1m_prank)}
      </Badge>

      <Badge variant="outline" className="px-2 py-0.5 text-[10px]">
        3M {fmt(data.as_3m_prank)}
      </Badge>

      <Badge variant="outline" className="px-2 py-0.5 text-[10px]">
        6M {fmt(data.as_6m_prank)}
      </Badge>

      <Badge variant="outline" className="px-2 py-0.5 text-[10px]">
        12M {fmt(data.as_12m_prank)}
      </Badge>
    </div>
  );
}
