/**
 * Small pieces used only by the seasons pages.
 */
import Link from "next/link";
import { SpeciesAvatar } from "@/components/wrt/overview/overview-hero";
import type { SiteSpecies } from "@/components/wrt/sites/site-rows";
import type { QuantitySplit, ReconciliationRow } from "@/lib/wrt/types";
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
export function SeasonCell({ s, fewSites, top = [] }: { s: SeasonSummary; fewSites: boolean; top?: SiteSpecies[] }) {
  const shownTop = top.slice(0, 3);
  const more = s.speciesCount - shownTop.length;
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
      {shownTop.length > 0 && (
        <p className="wrt-sitesp__top">
          <span className="wrt-sitesp__label">Most recorded</span>
          {shownTop.map((t) => (
            <Link
              key={t.species.slug}
              href={hrefs.records({ year: s.season.year, season: s.season.name, species: t.species.slug })}
              className="wrt-mini"
              data-review={t.split.needsReview > 0 || undefined}
            >
              <SpeciesAvatar species={t.species} />
              <span className={t.species.displayIsScientific ? "italic" : undefined}>{t.species.displayName}</span>
              <b className="tabular-nums">{formatNumber(t.split.total)}</b>
            </Link>
          ))}
          {more > 0 && (
            <Link href={hrefs.season(s.season.slug)} className="wrt-sitesp__more">+{more} more →</Link>
          )}
        </p>
      )}
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

/**
 * One season as a card in the newest-first grid: figure, review share, reach,
 * the three most recorded species and the workbook check. The whole card opens
 * the season; species links go to their records for that season.
 */
export function SeasonCard({ s, fewSites, top = [] }: { s: SeasonSummary; fewSites: boolean; top?: SiteSpecies[] }) {
  const shownTop = top.slice(0, 3);
  const recon = s.reconciliation;
  const share = s.split.total ? Math.round((s.split.needsReview / s.split.total) * 100) : 0;
  return (
    <li className="wrt-scard2" data-season={s.season.name.toLowerCase()}>
      <div className="wrt-scard2__head">
        <h3 className="wrt-scard2__title">
          <Link href={hrefs.season(s.season.slug)} className="wrt-scard2__link">{s.season.label}</Link>
        </h3>
        {recon && recon.difference !== 0 && (
          <span className="wrt-scard2__check" title={reconSentence(recon)}>
            {`${recon.difference < 0 ? "−" : "+"}${formatNumber(Math.abs(recon.difference))} vs workbook`}
          </span>
        )}
      </div>

      <div className="wrt-scard2__figure">
        <b className="tabular-nums">{formatNumber(s.split.total)}</b>
        <span>recorded plants</span>
      </div>
      <SplitBar split={s.split} size="sm" />
      <p className="wrt-scard2__line">
        {s.split.needsReview > 0 ? (
          <span className="wrt-scard2__review tabular-nums">
            {formatNumber(s.split.needsReview)} need review ({share < 1 ? "<1" : share}%)
          </span>
        ) : (
          <span className="wrt-scard2__clear">None need review</span>
        )}
        <span className="tabular-nums">
          {formatNumber(s.placeCount)} site{s.placeCount === 1 ? "" : "s"} · {formatNumber(s.speciesCount)} species
        </span>
      </p>

      {shownTop.length > 0 && (
        <ol className="wrt-scard2__top" aria-label="Most recorded species">
          {shownTop.map((t) => (
            <li key={t.species.slug}>
              <Link
                href={hrefs.records({ year: s.season.year, season: s.season.name, species: t.species.slug })}
                className="wrt-scard2__sp"
                data-review={t.split.needsReview > 0 || undefined}
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
      )}

      {fewSites && <span className="wrt-scard2__note">Only {s.placeCount} site{s.placeCount === 1 ? "" : "s"} recorded</span>}
    </li>
  );
}

/** Grid placeholder for a season that is not in the workbook yet. */
export function MissingSeasonCard({ label }: { label: string }) {
  return (
    <li className="wrt-scard2 wrt-scard2--missing">
      <h3 className="wrt-scard2__title">{label}</h3>
      <p className="wrt-scard2__line m-0">Not in the master workbook yet, so there is nothing to show.</p>
    </li>
  );
}

export interface TopSite {
  slug: string;
  name: string;
  split: QuantitySplit;
}

/**
 * One season as a full-width row, in the same order as the species rows: the season and its total,
 * a quiet strip of facts, then its top trees and top sites side by side. Review stays quiet: a note only
 * when most of the season is unconfirmed. The season name opens the season.
 */
export function SeasonRow({
  s, fewSites, trees = [], sites = [],
}: { s: SeasonSummary; fewSites: boolean; trees?: SiteSpecies[]; sites?: TopSite[] }) {
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
                <span className="wrt-srow__pin" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21s-6.5-5.7-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 15.3 12 21 12 21Z" />
                    <circle cx="12" cy="9.8" r="2.3" />
                  </svg>
                </span>
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

/** Row placeholder for a season that is not in the workbook yet. */
export function MissingSeasonRow({ label }: { label: string }) {
  return (
    <li className="wrt-srow wrt-srow--missing">
      <h3 className="wrt-srow__title">{label}</h3>
      <p className="wrt-scard2__line m-0">Not in the master workbook yet, so there is nothing to show.</p>
    </li>
  );
}
