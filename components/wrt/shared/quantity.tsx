/**
 * Quantity display. Every number of plants in the app goes through these, so
 * the recorded / needs-review split is never dropped.
 *
 * Words: always "recorded plants", never "planted".
 */
import type { QuantitySplit } from "@/lib/wrt/types";
import { formatNumber, formatShare } from "@/lib/wrt/text";
import { cn } from "@/lib/utils";

export function plants(n: number) {
  return `${formatNumber(n)} recorded plant${n === 1 ? "" : "s"}`;
}

/** "of which 931 need review (3%)" or "all records resolved". */
export function SplitLine({ split, className }: { split: QuantitySplit; className?: string }) {
  if (split.records === 0) return <span className={cn("wrt-split-line wrt-split-line--none", className)}>No records</span>;
  return (
    <span className={cn("wrt-split-line", className)}>
      {formatNumber(split.resolved)} resolved
      {" · "}
      {split.needsReview > 0 || split.recordsNeedingReview > 0 ? (
        <span className="wrt-review">
          {formatNumber(split.needsReview)} on {formatNumber(split.recordsNeedingReview)} record
          {split.recordsNeedingReview === 1 ? "" : "s"} needing review ({formatShare(split.needsReview, split.total)})
        </span>
      ) : (
        <span>none needing review</span>
      )}
    </span>
  );
}

/** Horizontal bar: resolved (green) then needs review (amber). Width relative to `max`. */
export function SplitBar({
  split, max, size = "md", className, label,
}: { split: QuantitySplit; max?: number; size?: "md" | "sm"; className?: string; label?: string }) {
  const whole = max ?? split.total;
  const r = whole ? (split.resolved / whole) * 100 : 0;
  const n = whole ? (split.needsReview / whole) * 100 : 0;
  return (
    <div
      className={cn("cn-bar cn-bar--seg", size === "sm" && "cn-bar--sm", className)}
      role="img"
      aria-label={label ?? `${formatNumber(split.resolved)} resolved${split.needsReview > 0 ? `, ${formatNumber(split.needsReview)} needing review` : ""}`}
    >
      {r > 0 && <div className="cn-bar__fill" style={{ width: `${r}%` }} />}
      {n > 0 && <div className="cn-bar__fill cn-bar__fill--review" style={{ width: `${n}%` }} />}
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
      <span className="wrt-key"><i />{spring ? "Autumn, resolved" : "Resolved"}</span>
      {spring && <span className="wrt-key"><i style={{ background: "var(--cn-green-600)" }} />Spring, resolved</span>}
      <span className="wrt-key wrt-key--review"><i className="is-review" />Needs review</span>
    </span>
  );
}

/** Compact number + review count, for table cells. */
export function QuantityCell({ split }: { split: QuantitySplit }) {
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className="font-extrabold tabular-nums">{formatNumber(split.total)}</span>
      {split.needsReview > 0 && (
        <span className="[font:600_11.5px/1_var(--font-sans)] text-[var(--cn-behind-fg)] whitespace-nowrap">
          {formatNumber(split.needsReview)} need review
        </span>
      )}
    </span>
  );
}
