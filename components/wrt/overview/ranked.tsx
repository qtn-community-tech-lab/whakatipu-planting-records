/**
 * Ranked bars for the home page. Same look as the shared RankedBars, but the
 * value column has a fixed width so the bars line up from row to row.
 */
import Link from "next/link";
import type { RankedItem } from "@/components/wrt/charts";
import { SplitBar } from "@/components/wrt/quantity";
import { formatNumber } from "@/lib/wrt/text";

const ROW =
  "!grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_6.75rem] max-sm:!grid-cols-[minmax(0,1fr)_auto]";

export function AlignedBars({ items }: { items: RankedItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.split.total));
  return (
    <div className="wrt-ranked">
      {items.map((it) => {
        const inner = (
          <>
            <span className="min-w-0">{it.label}</span>
            <SplitBar split={it.split} max={max} size="sm" />
            <span className="wrt-ranked__value">
              {formatNumber(it.split.total)}
              {it.split.needsReview > 0 && (
                <span className="wrt-ranked__sub">{formatNumber(it.split.needsReview)} need review</span>
              )}
            </span>
          </>
        );
        return it.href ? (
          <Link key={it.key} href={it.href} className={`wrt-ranked__row ${ROW}`}>{inner}</Link>
        ) : (
          <div key={it.key} className={`wrt-ranked__row ${ROW}`}>{inner}</div>
        );
      })}
    </div>
  );
}
