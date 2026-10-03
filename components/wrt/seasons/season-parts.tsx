/**
 * Small pieces used only by the seasons pages.
 */
import Link from "next/link";
import type { ReconciliationRow } from "@/lib/wrt/types";
import type { SeasonSummary } from "@/lib/wrt/queries";
import { formatNumber } from "@/lib/wrt/text";
import { Badge } from "@/components/ui/badge";
import { SplitBar, SplitLine } from "@/components/wrt/quantity";
import { hrefs } from "@/components/wrt/names";

/** Spoken sentence behind the badge: generated vs the workbook's own TOTAL cell. */
export function reconSentence(r: ReconciliationRow) {
  return r.difference === 0
    ? `Generated ${formatNumber(r.generated)} = workbook ${formatNumber(r.stated)} (${r.statedCell})`
    : `Generated ${formatNumber(r.generated)}, workbook states ${formatNumber(r.stated)} (${r.statedCell})`;
}

/** Reconciliation marker: does our total match the workbook's own TOTAL cell? */
export function ReconBadge({ recon }: { recon: ReconciliationRow | null }) {
  if (!recon) return <Badge tone="soft">No workbook total to check</Badge>;
  if (recon.difference === 0) {
    return <Badge tone="ok" title={reconSentence(recon)}>✓ Matches workbook total</Badge>;
  }
  const d = recon.difference;
  return (
    <Badge tone="review" title={reconSentence(recon)}>
      Differs from workbook by {d < 0 ? "−" : "+"}{formatNumber(Math.abs(d))}
    </Badge>
  );
}

/** Median site count, used to flag seasons that recorded far fewer sites than usual. */
export function medianSites(seasons: SeasonSummary[]) {
  const counts = seasons.filter((s) => s.split.records > 0).map((s) => s.placeCount).sort((a, b) => a - b);
  return counts.length ? counts[Math.floor(counts.length / 2)] : 0;
}

/** One season inside a year row: name, figure, split, counts, workbook check. */
export function SeasonCell({ s, fewSites }: { s: SeasonSummary; fewSites: boolean }) {
  return (
    <div className="flex flex-col gap-2.5 min-w-0">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <Link href={hrefs.season(s.season.slug)} className="cn-row__title !text-[var(--text-strong)] hover:!text-[var(--text-brand)] hover:underline underline-offset-2">
          {s.season.label}
        </Link>
        <span className="wrt-muted">
          {formatNumber(s.placeCount)} site{s.placeCount === 1 ? "" : "s"} · {formatNumber(s.speciesCount)} species
        </span>
      </div>
      <div className="wrt-figure">
        <span className="wrt-figure__value wrt-figure__value--md">{formatNumber(s.split.total)}</span>
        <span className="wrt-figure__unit">recorded plants</span>
      </div>
      <SplitBar split={s.split} />
      <SplitLine split={s.split} />
      <div className="wrt-pills items-center">
        <ReconBadge recon={s.reconciliation} />
        {s.reconciliation && <span className="wrt-rule">{s.reconciliation.statedCell}</span>}
        {fewSites && <Badge tone="soft">Only {s.placeCount} site{s.placeCount === 1 ? "" : "s"} recorded</Badge>}
      </div>
    </div>
  );
}

/** Placeholder for a season that is not in the workbook. Never a number. */
export function MissingSeasonCell({ label }: { label: string }) {
  return (
    <div className="cn-tile cn-tile--empty items-start justify-center min-w-0">
      <span className="cn-row__title !text-[var(--text-body)]">{label}</span>
      <span className="wrt-muted">Not in the master workbook yet.</span>
    </div>
  );
}
