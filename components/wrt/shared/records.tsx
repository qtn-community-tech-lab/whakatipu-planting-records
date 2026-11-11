/**
 * Record-level views: the table of species × site × season rows, provenance,
 * and review notes. Provenance is part of the trust model: every row can show
 * the exact spreadsheet cell it came from.
 */
import { Fragment } from "react";
import { SpeciesAvatar } from "./species-avatar";
import Link from "next/link";
import type { PlantingRecord, ReviewNote } from "@/lib/wrt/types";
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
        {record.notes
          .filter((n) => n.kind === "fyi" || !record.needsReview)
          .map((n, i) => (
            <div key={i} className="contents">
              <dt>{n.kind === "ruling" ? "WRT ruling" : n.kind === "confirm" ? "To confirm" : "Mapping note"}</dt>
              <dd>{n.text}</dd>
            </div>
          ))}
      </dl>
    </details>
  );
}

function RecordStatus({ record }: { record: PlantingRecord }) {
  const asks = actionable(record);
  const decisions = asks.filter((n) => n.kind === "ruling").length;
  const checks = asks.length - decisions;
  return (
    <span className="wrt-pills">
      {record.needsReview ? <Badge tone="review">Needs review</Badge> : <Badge tone="ok">Resolved</Badge>}
      {record.needsReview && decisions > 0 && <Badge tone="soft">{decisions === 1 ? "1 decision" : `${decisions} decisions`}</Badge>}
      {record.needsReview && checks > 0 && <Badge tone="soft">{checks === 1 ? "1 check" : `${checks} checks`}</Badge>}
      {record.confidence !== "high" && <ConfidenceBadge confidence={record.confidence} />}
      {(record.precision === "area" || record.precision === "scheme" || record.precision === "unknown") && (
        <PrecisionBadge precision={record.precision} />
      )}
    </span>
  );
}

/** Notes that ask WRT for something, one per theme (FYI mapping notes excluded). */
function actionable(record: PlantingRecord): ReviewNote[] {
  if (!record.needsReview) return [];
  const seen = new Set<string>();
  return record.notes.filter((n) => {
    if (n.kind === "fyi") return false;
    const key = `${n.kind}:${n.theme}:${n.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The record-specific part of a note, without words that repeat the theme's question. */
function detailFor(n: ReviewNote): string | null {
  let t = n.text.trim();
  if (n.theme === "order-scheme") return null;
  if (n.theme === "contested-species") {
    const m = t.match(/^species contested with (.+?):/i);
    if (m) return `Contested with ${m[1]}.`;
  }
  if (n.theme === "new-site") t = t.replace(/^new or unclear site with no WRT site number:\s*/i, "");
  if (n.theme === "slope-hill-2024") t = t.replace(/^decision \d+:\s*/i, "");
  if (!t) return null;
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.?!)]$/.test(t) ? t : `${t}.`;
}

const KIND_COPY = {
  ruling: {
    tag: "WRT decision",
    effect: "One decision settles every record with this question.",
  },
  confirm: {
    tag: "Quick check",
    effect: "A one-off check of this record. Nothing else depends on it.",
  },
} as const;

/** What WRT needs to settle on one record: the question, the detail, and where its siblings are. */
function ReviewIssue({ record, focusTheme }: { record: PlantingRecord; focusTheme?: string | undefined }) {
  const asks = actionable(record);
  if (!asks.length) return null;
  return (
    <div className="wrt-issue">
      {asks.map((n, i) => {
        const theme = REVIEW_THEMES[n.theme];
        const kind = KIND_COPY[n.kind === "confirm" ? "confirm" : "ruling"];
        const focused = focusTheme === n.theme;
        const detail = detailFor(n);
        if (focused) {
          return (
            <div key={i} className="wrt-issue__item wrt-issue__item--compact" data-kind={n.kind}>
              <span className="wrt-issue__mark" aria-hidden="true">?</span>
              <p className="wrt-issue__head">
                <span className="wrt-issue__tag" title={kind.effect}>{kind.tag}</span>
                <span className="wrt-issue__inline">
                  <span className="sr-only">{theme.label}: </span>
                  {detail ?? theme.question}
                </span>
              </p>
            </div>
          );
        }
        return (
          <div key={i} className="wrt-issue__item" data-kind={n.kind}>
            <span className="wrt-issue__mark" aria-hidden="true">?</span>
            <div className="wrt-issue__body">
              <p className="wrt-issue__head">
                <span className="wrt-issue__tag" title={kind.effect}>{kind.tag}</span>
                <span className="wrt-issue__title">{theme.label}</span>
                <Link href={hrefs.records({ review: "needs-review", theme: n.theme })} className="wrt-issue__link">
                  All records with this question →
                </Link>
              </p>
              <p className="wrt-issue__question">{theme.question}</p>
              {detail && (
                <p className="wrt-issue__detail">
                  <span className="wrt-issue__label">This record</span>
                  <span>{detail}</span>
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** One-line key above a table that has flagged rows. */
function IssueKey() {
  return (
    <p className="wrt-issue-key">
      <span><b className="wrt-issue__tag">WRT decision</b> {KIND_COPY.ruling.effect}</span>
      <span><b className="wrt-issue__tag wrt-issue__tag--check">Quick check</b> {KIND_COPY.confirm.effect}</span>
    </p>
  );
}

/**
 * Table of records. Hide columns that the page already fixes
 * (e.g. hide "site" on a site page).
 */
export function RecordsTable({
  rows, hide = [], caption, focusTheme,
}: {
  rows: RecordView[];
  hide?: ("season" | "site" | "species")[];
  caption?: string;
  /** The review question the list is already filtered to: rows then show only their own detail. */
  focusTheme?: string | undefined;
}) {
  const show = (c: "season" | "site" | "species") => !hide.includes(c);
  const cols = 3 + (["season", "site", "species"] as const).filter(show).length;
  const anyIssue = rows.some((r) => r.record.needsReview);
  return (
    <div className="wrt-table-wrap">
      {anyIssue && <IssueKey />}
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
            <Fragment key={record.id}>
            <tr className={record.needsReview ? "is-review has-issue" : undefined}>
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
              {show("species") && <td><span className="wrt-tcell-sp"><SpeciesAvatar species={species} /><SpeciesName species={species} link /></span></td>}
              <td className="cn-num font-extrabold">{record.hasQuantity ? formatNumber(record.quantity) : <span className="cn-num--empty">–</span>}</td>
              <td><RecordStatus record={record} /></td>
              <td><Provenance record={record} /></td>
            </tr>
            {record.needsReview && (
              <tr className="is-review wrt-issue-row">
                <td colSpan={cols}>
                  <ReviewIssue record={record} focusTheme={focusTheme} />
                </td>
              </tr>
            )}
            </Fragment>
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
