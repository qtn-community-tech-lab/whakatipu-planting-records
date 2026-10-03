import type { SpeciesSummary } from "@/lib/wrt/queries";
import { formatNumber } from "@/lib/wrt/text";
import { SpeciesName } from "@/components/wrt/names";
import { SplitBar } from "@/components/wrt/quantity";
import { SpeciesMarkers } from "./species-meta";

/** One species in the field guide: name and markers, recorded plants, sites, seasons. */
export function SpeciesRow({ row, max }: { row: SpeciesSummary; max: number }) {
  const { item: sp, split, span, placeCount } = row;
  return (
    <li className="grid items-center gap-x-6 gap-y-2.5 border-t border-[var(--border-row)] py-3.5 first:border-t-0 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="flex min-w-0 flex-col gap-2">
        <SpeciesName species={sp} link />
        <SpeciesMarkers species={sp} />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="flex items-baseline justify-between gap-3">
          <span className="font-extrabold tabular-nums">{formatNumber(split.total)}</span>
          <span className="wrt-ranked__sub !mt-0 !text-right">
            {split.needsReview > 0 ? `${formatNumber(split.needsReview)} need review` : " "}
          </span>
        </span>
        <SplitBar split={split} max={max} size="sm" />
      </div>
      <p className="m-0 flex flex-col gap-1 [font:600_13px/1.35_var(--font-sans)] text-[var(--text-body)]">
        <span>
          {formatNumber(placeCount)} site{placeCount === 1 ? "" : "s"}
        </span>
        <span className="text-[var(--text-muted)]">
          {span.seasonsActive === 1 ? span.first.label : `${span.first.label} → ${span.last.label}`}
        </span>
      </p>
    </li>
  );
}
