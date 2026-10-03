/**
 * Record-level views: the table of species × site × season rows, provenance,
 * and review notes. Provenance is part of the trust model: every row can show
 * the exact spreadsheet cell it came from.
 */
import Link from "next/link";
import type { PlantingRecord } from "@/lib/wrt/types";
import type { RecordView, ThemeSummary } from "@/lib/wrt/queries";
import { REVIEW_THEMES } from "@/lib/wrt/review-themes";
import { formatNumber } from "@/lib/wrt/text";
import { ConfidenceBadge, PrecisionBadge, SpeciesName, hrefs } from "./names";
import { Badge } from "@/components/ui/badge";
import { SplitBar } from "./quantity";

/** Expandable audit trail back to the source cell. */
export function Provenance({ record }: { record: PlantingRecord }) {
  const p = record.provenance;
  const fileName = p.sourceFile.split("/").pop() ?? p.sourceFile;
  return (
    <details className="wrt-prov">
      <summary>Source</summary>
      <dl>
        <dt>Cell</dt>
        <dd><code>{p.sourceSheet}!{p.sourceCell}</code></dd>
        <dt>Workbook</dt>
        <dd title={p.sourceFile}>{fileName}</dd>
        <dt>Season as typed</dt>
        <dd>{p.seasonLabelOriginal}</dd>
        <dt>Site as typed</dt>
        <dd>{p.siteOriginal}</dd>
        <dt>Species as typed</dt>
        <dd>{p.speciesOriginal}</dd>
        <dt>Confidence</dt>
        <dd className="capitalize">{record.confidence}</dd>
        {!record.hasQuantity && (
          <>
            <dt>Quantity</dt>
            <dd>Cell held text, not a number. Counted as 0.</dd>
          </>
        )}
        {record.notes.map((n, i) => (
          <div key={i} className="contents">
            <dt>{n.kind === "ruling" ? "WRT ruling" : n.kind === "confirm" ? "To confirm" : "Mapping note"}</dt>
            <dd>{n.text}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function RecordStatus({ record }: { record: PlantingRecord }) {
  const themes = [...new Set(record.notes.filter((n) => n.kind !== "fyi").map((n) => n.theme))];
  return (
    <span className="wrt-pills">
      {record.needsReview ? <Badge tone="review">Needs review</Badge> : <Badge tone="ok">Resolved</Badge>}
      {record.needsReview && themes.map((t) => (
        <Badge key={t} tone="soft">{REVIEW_THEMES[t].label}</Badge>
      ))}
      {record.confidence !== "high" && <ConfidenceBadge confidence={record.confidence} />}
      {(record.precision === "area" || record.precision === "scheme" || record.precision === "unknown") && (
        <PrecisionBadge precision={record.precision} />
      )}
    </span>
  );
}

/**
 * Table of records. Hide columns that the page already fixes
 * (e.g. hide "site" on a site page).
 */
export function RecordsTable({
  rows, hide = [], caption,
}: { rows: RecordView[]; hide?: ("season" | "site" | "species")[]; caption?: string }) {
  const show = (c: "season" | "site" | "species") => !hide.includes(c);
  return (
    <div className="wrt-table-wrap">
      <table className="wrt-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {show("season") && <th>Season</th>}
            {show("site") && <th>Site</th>}
            {show("species") && <th>Species</th>}
            <th className="cn-num">Recorded plants</th>
            <th>Status</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ record, species, place, season }) => (
            <tr key={record.id} className={record.needsReview ? "is-review" : undefined}>
              {show("season") && (
                <td className="whitespace-nowrap"><Link href={hrefs.season(season.slug)}>{season.label}</Link></td>
              )}
              {show("site") && (
                <td>
                  <span className="cn-species">
                    <Link href={hrefs.place(place.slug)} className="cn-species__common">{place.name}</Link>
                    {record.parcelName !== place.name && <span className="cn-species__latin is-plain">{record.parcelName}</span>}
                  </span>
                </td>
              )}
              {show("species") && <td><SpeciesName species={species} link /></td>}
              <td className="cn-num font-extrabold">{record.hasQuantity ? formatNumber(record.quantity) : <span className="cn-num--empty">–</span>}</td>
              <td><RecordStatus record={record} /></td>
              <td><Provenance record={record} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Open questions for WRT, grouped by theme, each linking to its records. */
export function ReviewThemeList({
  themes, recordsQuery = {},
}: { themes: ThemeSummary[]; recordsQuery?: Record<string, string | number | undefined> }) {
  if (!themes.length) return <p className="wrt-muted m-0">No records here need a WRT ruling.</p>;
  const max = Math.max(...themes.map((t) => t.split.total), 1);
  return (
    <div className="flex flex-col">
      {themes.map((t) => (
        <Link
          key={t.theme}
          href={hrefs.records({ ...recordsQuery, review: "needs-review", theme: t.theme })}
          className="cn-row wrt-theme-row !text-[var(--text-strong)] hover:bg-[var(--surface-soft)] first:border-t-0"
        >
          <span className="flex flex-col gap-1.5 min-w-0">
            <span className="cn-row__title">{REVIEW_THEMES[t.theme].label}</span>
            <span className="cn-row__line">{REVIEW_THEMES[t.theme].question}</span>
            <SplitBar split={{ ...t.split, resolved: 0, total: t.split.needsReview }} max={max} size="sm" className="max-w-[280px]" />
          </span>
          <Badge tone="review" size="lg">
            {formatNumber(t.split.needsReview)} plants · {formatNumber(t.split.recordsNeedingReview)} record{t.split.recordsNeedingReview === 1 ? "" : "s"}
          </Badge>
        </Link>
      ))}
    </div>
  );
}
