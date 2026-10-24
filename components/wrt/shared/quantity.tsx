/** Shared displays for known recorded totals and unknown counts. */
import type { Quantity } from "@/lib/wrt/types";
import { formatNumber } from "@/lib/wrt/text";
import { cn } from "@/lib/utils";

export function plants(n: number) {
  return `${formatNumber(n)} recorded plant${n === 1 ? "" : "s"}`;
}

export function SplitLine({ split, className }: { split: Quantity; className?: string }) {
  if (split.records === 0) return <span className={cn("wrt-split-line wrt-split-line--none", className)}>No records</span>;
  return (
    <span className={cn("wrt-split-line", className)}>
      {formatNumber(split.records)} records
      {split.unknown > 0 && <span> · {formatNumber(split.unknown)} with unknown counts</span>}
    </span>
  );
}

/** Width relative to the largest known total. */
export function SplitBar({
  split, max, size = "md", className, label,
}: { split: Quantity; max?: number; size?: "md" | "sm"; className?: string; label?: string }) {
  const whole = max ?? split.total;
  const width = whole ? split.total / whole * 100 : 0;
  return (
    <div
      className={cn("cn-bar cn-bar--seg", size === "sm" && "cn-bar--sm", className)}
      role="img"
      aria-label={label ?? `${plants(split.total)}${split.unknown ? `, ${split.unknown} unknown counts` : ""}`}
    >
      {width > 0 && <div className="cn-bar__fill" style={{ width: `${width}%` }} />}
    </div>
  );
}

export function QuantityFigure({
  split, size = "lg", unit = "recorded plants", showBar = true,
}: { split: Quantity; size?: "lg" | "md"; unit?: string; showBar?: boolean }) {
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

export function QuantityCell({ split }: { split: Quantity }) {
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className="font-extrabold tabular-nums">{formatNumber(split.total)}</span>
      {split.unknown > 0 && <span className="wrt-muted">{split.unknown} unknown counts</span>}
    </span>
  );
}
