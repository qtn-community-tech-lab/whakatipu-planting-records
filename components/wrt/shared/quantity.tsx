/**
 * Quantity display. Every number of plants in the app goes through these, so
 * recorded totals are consistent across pages.
 *
 * Words: always "recorded plants", never "planted".
 */
import type { QuantitySplit } from "@/lib/wrt/types";
import { formatNumber } from "@/lib/wrt/text";
import { cn } from "@/lib/utils";

export function plants(n: number) {
  return `${formatNumber(n)} recorded plant${n === 1 ? "" : "s"}`;
}

/** Number of source records represented by a total. */
export function SplitLine({ split, className }: { split: QuantitySplit; className?: string }) {
  return <span className={cn("wrt-split-line", className)}>{split.records ? `${formatNumber(split.records)} ${split.records === 1 ? "record" : "records"}` : "No records"}</span>;
}

/** Recorded total, relative to the largest item. */
export function SplitBar({
  split, max, size = "md", className, label,
}: { split: QuantitySplit; max?: number; size?: "md" | "sm"; className?: string; label?: string }) {
  const whole = max ?? split.total;
  const width = whole ? (split.total / whole) * 100 : 0;
  return (
    <div className={cn("cn-bar", size === "sm" && "cn-bar--sm", className)} role="img" aria-label={label ?? plants(split.total)}>
      {width > 0 && <div className="cn-bar__fill" style={{ width: `${width}%` }} />}
    </div>
  );
}

/** The headline figure: big number + "recorded plants" + split line + bar. */
export function QuantityFigure({
  split, size = "lg", unit = "recorded plants", showBar = true,
}: { split: QuantitySplit; size?: "lg" | "md"; unit?: string; showBar?: boolean }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="wrt-figure">
        <span className={cn("wrt-figure__value", size === "md" && "wrt-figure__value--md")}>{formatNumber(split.total)}</span>
        <span className="wrt-figure__unit">{unit}</span>
      </div>
      {showBar && <SplitBar split={split} />}
      <SplitLine split={split} />
    </div>
  );
}

/** Legend for split bars and season columns. */
export function SplitKey({ spring = false }: { spring?: boolean }) {
  return (
    <span className="flex flex-wrap gap-x-4 gap-y-2">
      <span className="wrt-key"><i />{spring ? "Autumn" : "Recorded plants"}</span>
      {spring && <span className="wrt-key"><i style={{ background: "var(--cn-green-600)" }} />Spring</span>}
    </span>
  );
}

/** Compact recorded total, for table cells. */
export function QuantityCell({ split }: { split: QuantitySplit }) {
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className="font-extrabold tabular-nums">{formatNumber(split.total)}</span>
    </span>
  );
}
