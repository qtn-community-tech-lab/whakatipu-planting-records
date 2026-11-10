import type { AppRoute } from "@/lib/wrt/routes";
/**
 * Species as tiles: picture, names, recorded plants with the split, and how
 * widely each one went in. Built from any set of records (a season, a site,
 * a site in one year), largest first.
 */
import Link from "next/link";
import { addToSplit, byTotalDesc, emptySplit, type RecordView } from "@/lib/wrt/queries";
import type { QuantitySplit, Species } from "@/lib/wrt/types";
import { formatNumber } from "@/lib/wrt/text";
import { SplitBar } from "@/components/wrt/shared/quantity";
import { SpeciesAvatar } from "@/components/wrt/shared/species-avatar";


export function SpeciesTiles({
  records, hrefFor, spread, cap = 18,
}: {
  records: RecordView[];
  /** Where a tile goes: usually the records behind its number. */
  hrefFor: (species: Species) => AppRoute;
  /** What the small count under the bar measures. */
  spread: "sites" | "seasons";
  cap?: number;
}) {
  const bySpecies = new Map<string, { species: Species; split: QuantitySplit; spread: Set<string> }>();
  for (const v of records) {
    const t = bySpecies.get(v.species.slug) ?? { species: v.species, split: emptySplit(), spread: new Set<string>() };
    addToSplit(t.split, v.record);
    t.spread.add(spread === "sites" ? v.place.slug : v.season.slug);
    bySpecies.set(v.species.slug, t);
  }
  const rows = [...bySpecies.values()].sort(byTotalDesc);
  const max = Math.max(1, ...rows.map((r) => r.split.total));
  const unit = spread === "sites" ? "site" : "season";

  const tile = (r: (typeof rows)[number], i: number) => (
    <li key={r.species.slug} className="wrt-tile">
      <span className="wrt-tile__rank">{i + 1}</span>
      <SpeciesAvatar species={r.species} />
      <span className="wrt-tile__names">
        <Link href={hrefFor(r.species)} className={r.species.displayIsScientific ? "wrt-tile__name italic" : "wrt-tile__name"}>
          {r.species.displayName}
        </Link>
        {!r.species.displayIsScientific && <span className="wrt-tile__latin">{r.species.scientificName}</span>}
      </span>
      <span className="wrt-tile__num">
        <b className="tabular-nums">{formatNumber(r.split.total)}</b>
        {r.split.needsReview > 0 && (
          <span className="wrt-tile__review tabular-nums">{formatNumber(r.split.needsReview)} need review</span>
        )}
      </span>
      <span className="wrt-tile__foot">
        <SplitBar split={r.split} max={max} size="sm" />
        <span className="wrt-tile__sites">
          {r.spread.size} {unit}
          {r.spread.size === 1 ? "" : "s"}
        </span>
      </span>
    </li>
  );
  const shown = rows.slice(0, cap);
  const rest = rows.slice(cap);

  return (
    <div className="wrt-tgrid-wrap">
      <ol className="wrt-tgrid">{shown.map((r, i) => tile(r, i))}</ol>
      {rest.length > 0 && (
        <details className="wrt-tmore">
          <summary>
            <span className="wrt-tmore__open">Show all {formatNumber(rows.length)} species</span>
            <span className="wrt-tmore__close">Show the top {cap} only</span>
          </summary>
          <ol className="wrt-tgrid" start={cap + 1}>{rest.map((r, i) => tile(r, i + cap))}</ol>
        </details>
      )}
    </div>
  );
}
