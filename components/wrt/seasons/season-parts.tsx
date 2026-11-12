/**
 * Small pieces used only by the seasons pages.
 */
import Link from "next/link";
import { Pin } from "@/components/wrt/shared/pin";
import { SpeciesAvatar } from "@/components/wrt/shared/species-avatar";

import type { QuantitySplit, ReconciliationRow, Species } from "@/lib/wrt/types";
import type { SeasonSummary } from "@/lib/wrt/queries";
import { formatNumber } from "@/lib/wrt/text";
import { Badge } from "@/components/ui/badge";
import { hrefs } from "@/components/wrt/shared/names";

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
  return counts[Math.floor(counts.length / 2)] ?? 0;
}

export interface TopSite {
  slug: string;
  name: string;
  split: Pick<QuantitySplit, "total">;
}

/** A season's top species: just what the row shows. */
export interface TopSpecies {
  species: Pick<Species, "photos" | "id" | "slug" | "scientificName" | "displayName" | "displayIsScientific">;
  split: Pick<QuantitySplit, "total">;
}

/**
 * One season as a full-width row, in the same order as the species rows: the season and its total,
 * a quiet strip of facts, then its top trees and top sites side by side. Review stays quiet: a note only
 * when most of the season is unconfirmed. The season name opens the season.
 */
export function SeasonRow({
  s, fewSites, trees = [], sites = [],
}: { s: SeasonSummary; fewSites: boolean; trees?: TopSpecies[]; sites?: TopSite[] }) {
  const recon = s.reconciliation;
  const q = { year: s.season.year, season: s.season.name };
  return (
    <li className="wrt-srow" data-season={s.season.name.toLowerCase()}>
      <div className="wrt-srow__main">
        <h3 className="wrt-srow__title">
          <Link href={hrefs.season(s.season.slug)}>{s.season.label}</Link>
        </h3>
        <div className="wrt-scard2__figure">
          <b className="tabular-nums">{formatNumber(s.split.total)}</b>
          <span>recorded plants</span>
          {s.split.needsReview * 2 > s.split.total && (
            <span className="wrt-scard__unsure" title={`${formatNumber(s.split.needsReview)} still need a WRT ruling`}>mostly unconfirmed</span>
          )}
        </div>
        <dl className="wrt-scard__facts">
          <div><dt>Sites</dt><dd>{formatNumber(s.placeCount)}</dd></div>
          <div><dt>Species</dt><dd>{formatNumber(s.speciesCount)}</dd></div>
          {recon && recon.difference !== 0 && (
            <div title={reconSentence(recon)}>
              <dt>Workbook</dt>
              <dd>{`${recon.difference < 0 ? "−" : "+"}${formatNumber(Math.abs(recon.difference))}`}</dd>
            </div>
          )}
        </dl>
        {fewSites && <span className="wrt-scard2__note">Only {s.placeCount} site{s.placeCount === 1 ? "" : "s"} recorded</span>}
      </div>

      <div className="wrt-srow__col">
        <span className="wrt-srow__label">Top trees</span>
        <ol className="wrt-srow__list">
          {trees.map((t) => (
            <li key={t.species.slug}>
              <Link
                href={hrefs.records({ ...q, species: t.species.slug })}
                className="wrt-scard2__sp"
              >
                <SpeciesAvatar species={t.species} />
                <span className={t.species.displayIsScientific ? "wrt-scard2__spname italic" : "wrt-scard2__spname"}>
                  {t.species.displayName}
                </span>
                <b className="tabular-nums">{formatNumber(t.split.total)}</b>
              </Link>
            </li>
          ))}
        </ol>
        {s.speciesCount > trees.length && (
          <Link href={hrefs.season(s.season.slug)} className="wrt-srow__more">All {formatNumber(s.speciesCount)} species →</Link>
        )}
      </div>

      <div className="wrt-srow__col">
        <span className="wrt-srow__label">Top sites</span>
        <ol className="wrt-srow__list">
          {sites.map((t) => (
            <li key={t.slug}>
              <Link
                href={hrefs.records({ ...q, place: t.slug })}
                className="wrt-scard2__sp"
              >
                <Pin className="wrt-srow__pin" />
                <span className="wrt-scard2__spname">{t.name}</span>
                <b className="tabular-nums">{formatNumber(t.split.total)}</b>
              </Link>
            </li>
          ))}
        </ol>
        {s.placeCount > sites.length && (
          <Link href={hrefs.season(s.season.slug)} className="wrt-srow__more">All {formatNumber(s.placeCount)} sites →</Link>
        )}
      </div>
    </li>
  );
}
