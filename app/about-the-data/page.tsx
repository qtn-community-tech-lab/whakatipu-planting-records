import type { Metadata } from "next";
import Link from "next/link";
import { getWrt } from "@/lib/wrt/server";
import { Card, CardLink, PageHead, Rule } from "@/components/wrt/page";
import { QuantityFigure } from "@/components/wrt/quantity";
import { ReviewThemeList } from "@/components/wrt/records";
import { hrefs } from "@/components/wrt/names";
import { ConfidenceList, PrecisionList } from "@/components/wrt/about/precision";
import { GrandReconciliationTable, SeasonReconciliationTable } from "@/components/wrt/about/reconciliation";
import { ThreatenedLink, ThreatenedQuestions, ThreatenedTable } from "@/components/wrt/about/threatened";
import { formatNumber, formatShare } from "@/lib/wrt/text";

export const metadata: Metadata = {
  title: "About the data",
  description: "How to read every number in the WRT planting history: what a recorded plant is, what is still open, and how the totals check out.",
};

const SECTIONS = [
  { id: "recorded", label: "Recorded, not verified" },
  { id: "rulings", label: "Open for a ruling" },
  { id: "threatened", label: "Threatened marks" },
  { id: "precision", label: "How precise" },
  { id: "totals", label: "Checked against WRT’s totals" },
  { id: "source", label: "Where it comes from" },
  { id: "limits", label: "What this version does not do" },
];

export default async function AboutTheData() {
  const wrt = getWrt();
  const [dq, overview] = await Promise.all([wrt.dataQuality(), wrt.overview()]);
  const { split } = dq;

  const seasonRows = dq.reconciliation.filter((r) => r.kind === "season");
  const grandRows = dq.reconciliation.filter((r) => r.kind === "grand");
  const exceptionRows = dq.reconciliation.filter((r) => r.kind === "exception");
  const seasonsMatching = seasonRows.filter((r) => r.difference === 0).length;
  const grandDisagree = grandRows.filter((r) => r.difference !== 0);
  const seasonsMatchAll = seasonRows.length > 0 && seasonsMatching === seasonRows.length;

  const themeSum = dq.themes.reduce((a, t) => a + t.split.needsReview, 0);
  const themeRecordSum = dq.themes.reduce((a, t) => a + t.split.recordsNeedingReview, 0);
  const slopeHill = dq.themes.find((t) => t.theme === "slope-hill-2024");

  const areaRows = dq.byPrecision.find((r) => r.item === "area");
  const marked = dq.threatened;
  const markedBoth = marked.filter((r) => r.agreed).length;
  const markedPo = marked.filter((r) => r.item.threatenedMarks.plantsOutMaster).length;
  const markedTe = marked.filter((r) => r.item.threatenedMarks.teKakano).length;
  const warnings = dq.issues.sample;

  return (
    <>
      <PageHead
        eyebrow="About the data"
        title={
          <>
            How to read {formatNumber(split.total)} recorded plants, and what sits behind them
          </>
        }
        lead={
          <>
            Every number in this app comes from the same {formatNumber(split.records)} records. This page says what a
            record is, what is still open, how precise the history can be, and how the totals check against WRT’s own
            workbook.
          </>
        }
      />

      <nav aria-label="On this page" className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="cn-chip">
            {s.label}
          </a>
        ))}
      </nav>

      <Card id="recorded" title="Recorded plants, not verified plantings">
        <div className="wrt-prose">
          <p>
            The planting history was not counted in the ground. It was filled in from the nursery’s allocation sheets:
            the Plants Out Master was updated from what was allocated to each site, then retyped into the master
            workbook. So each figure is what the records say was sent to a site for a season, which is why this app says{" "}
            <strong>recorded plants</strong> and never “planted”.
          </p>
          <p>
            Read a total as the best written record of what went to a site, not as a count of what is growing there
            today. Survival and losses are not in the history, and neither are the dates plants went in.
          </p>
          <p>
            Where a figure is still open for a WRT ruling, this app keeps it visible beside the total rather than
            folding it in or leaving it out. The bars use green for plants on records that need no ruling and amber for
            those that do.
          </p>
        </div>
      </Card>

      <Card
        id="rulings"
        title="What still needs a WRT ruling"
        foot={
          slopeHill
            ? `The Slope Hill 2024 columns alone hold ${formatNumber(slopeHill.split.needsReview)} recorded plants, ${formatShare(slopeHill.split.needsReview, split.total)} of everything on record.`
            : undefined
        }
      >
        <div className="wrt-grid wrt-grid--main-rail">
          <div className="flex flex-col gap-4">
            <QuantityFigure split={split} size="md" unit="recorded plants in all" />
            <div className="wrt-prose">
              <p className="!m-0">
                <strong>
                  {formatNumber(split.recordsNeedingReview)} records ({formatShare(split.recordsNeedingReview, split.records)}) carry{" "}
                  {formatNumber(split.needsReview)} recorded plants ({formatShare(split.needsReview, split.total)})
                </strong>{" "}
                that WRT has to rule on or confirm once. Until then the plants stay in the totals, flagged, and are
                never removed or guessed at.
              </p>
            </div>
          </div>
          <div className="wrt-prose">
            <p>
              A <em>ruling</em> is a decision only WRT can make, such as whether two names are one species. A{" "}
              <em>confirmation</em> is a quick check that a site was matched to the right column. Notes that only say how
              a site was mapped (<em>mapping notes</em>) do not flag a record.
            </p>
          </div>
        </div>

        <div className="pt-5">
          <h3 className="wrt-section-title pb-1">Open questions, by theme</h3>
          <ReviewThemeList themes={dq.themes} />
          <p className="wrt-rule mt-3 mb-0">
            A record can sit under more than one theme, so the theme figures overlap: they add to{" "}
            {formatNumber(themeSum)} recorded plants across {formatNumber(themeRecordSum)} theme entries, against{" "}
            {formatNumber(split.needsReview)} plants on {formatNumber(split.recordsNeedingReview)} records overall. Each
            theme links to its records.
          </p>
        </div>
      </Card>

      <Card
        id="threatened"
        title="Threatened species: marked by WRT, but on what basis?"
        foot="The app shows WRT’s marks as they are. It does not add, remove or correct any until WRT answers."
      >
        <p className="cn-callout cn-callout--risk m-0" role="note">
          <span>
            <b>Needs WRT’s answer before any threatened-species figure is reported.</b> {marked.length} species carry a
            threatened mark, but no file says which threat list or year the mark follows, and WRT’s two lists disagree on{" "}
            {marked.length - markedBoth} of them.
          </span>
        </p>
        <div className="wrt-prose">
          <p>
            WRT marks threatened species in two places: a <strong>T</strong> in the Master Plant List of the Plants Out
            Master ({markedPo} species), and a <strong>#</strong> before the name in the Te Kakano restoration plant
            species list ({markedTe} species). They agree on {markedBoth}.
          </p>
          <p className="!m-0">
            <strong>Why this has to be asked rather than looked up:</strong> a threatened mark should be checkable against
            the list it came from. Here there is nothing to check it against. Neither list names its source or the year
            it was set, and threat rankings change over time. Mānuka and kānuka are the clearest case: Te Kakano marks
            them, the Plants Out Master does not.
          </p>
        </div>
        <ThreatenedTable rows={marked} />
        <div className="flex flex-col gap-2 pt-2">
          <h3 className="wrt-section-title">Questions for WRT</h3>
          <ThreatenedQuestions rows={marked} />
        </div>
        <ThreatenedLink />
      </Card>

      <Card
        id="precision"
        title="How precise the records are"
        foot="Bars are drawn to the same scale within each list. Amber is the part still needing review."
      >
        <div className="wrt-prose pb-4">
          <p className="!m-0">
            Most records know only four things: a site, a species, a season and a quantity. There are no planting dates,
            event types, volunteer numbers, photographs, coordinates or polygons anywhere in the history, so none are
            shown.
            {areaRows ? (
              <>
                {" "}
                Detail below the level of a parcel appears only in Autumn 2026, on {formatNumber(areaRows.split.records)}{" "}
                records.
              </>
            ) : null}
          </p>
        </div>
        <div className="wrt-grid wrt-grid--2">
          <div className="flex flex-col gap-3">
            <h3 className="wrt-section-title">By precision</h3>
            <PrecisionList rows={dq.byPrecision} />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="wrt-section-title">By confidence</h3>
            <ConfidenceList rows={dq.byConfidence} />
          </div>
        </div>
      </Card>

      <Card id="totals" title="Checked against WRT’s own totals">
        <div className="wrt-prose pb-3">
          <p className="!m-0">
            {seasonsMatchAll ? (
              <>
                <strong>
                  All {seasonRows.length} seasons match.
                </strong>{" "}
                For every season, the records add to exactly the total WRT’s workbook states for it.
              </>
            ) : (
              <>
                <strong>
                  {seasonsMatching} of {seasonRows.length} seasons match.
                </strong>{" "}
                The others are marked below.
              </>
            )}
          </p>
        </div>
        <SeasonReconciliationTable rows={seasonRows} />

        <div className="pt-6">
          <h3 className="wrt-section-title pb-1">
            Why the workbook’s grand totals differ from {formatNumber(split.total)}
          </h3>
          <div className="wrt-prose pb-3">
            <p className="!m-0">
              The workbook states its all-time total in several places and they do not agree with each other.{" "}
              {grandDisagree.length > 0 ? (
                <>
                  {grandDisagree.map((r) => formatNumber(r.stated)).join(", ")} appear in different cells. The records
                  add to {formatNumber(split.total)}, and each gap has a cause that can be traced.
                </>
              ) : (
                <>They all agree with the records.</>
              )}
            </p>
          </div>
          <GrandReconciliationTable rows={grandRows} recordsTotal={split.total} />
          {exceptionRows.map((r) => (
            <p key={r.label} className="wrt-rule mt-3 mb-0 max-w-[72ch]">
              <strong className="text-[var(--text-strong)]">One cell is not a number.</strong> {r.cause}
            </p>
          ))}
        </div>
      </Card>

      <Card id="source" title="Where the data comes from">
        <div className="wrt-grid wrt-grid--main-rail">
          <div className="wrt-prose">
            <p className="[overflow-wrap:anywhere]">{dq.source.description}</p>
            <p>
              <strong>Every record keeps its origin.</strong> It carries the site, species and season exactly as they
              were typed, plus the source workbook, sheet and cell. Open <strong>Source</strong> on any row of a record
              table to see them, for example{" "}
              <Link href={hrefs.records({ place: "whitechapel", year: 2019 })} className="cn-link">
                the Whitechapel 2019 records
              </Link>
              .
            </p>
            <p className="!m-0">
              The original spreadsheets are never read by the app. It reads only the transformed files listed here, so
              what you see can always be traced back to a cell, but not edited from here.
            </p>
          </div>
          <div className="flex flex-col gap-2" role="list" aria-label="Files read, with row counts">
            {dq.source.files.map((f) => (
              <div key={f.name} className="cn-kv" role="listitem">
                <span className="min-w-0 break-words text-[13px] font-semibold">{f.name}</span>
                <b className="whitespace-nowrap tabular-nums">{formatNumber(f.rows)} rows</b>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card id="limits" title="What this version does not do">
        <ul className="wrt-prose m-0 flex list-none flex-col gap-2 p-0">
          <li>
            <strong>It does not edit anything.</strong> This is a reading copy of the history. Corrections go back to WRT
            and the source files, not into this app.
          </li>
          <li>
            <strong>It does not show current nursery stock</strong>, seed lots or potting. It covers plants that went
            out, not plants being grown.
          </li>
          <li>
            <strong>It has no maps.</strong> The history holds no coordinates or boundaries, so a map would have to
            invent them.
          </li>
          <li>
            <strong>The numbers will change.</strong> When WRT rules on the open questions above, flagged plants move
            into the resolved totals, are merged or are set aside, and the figures here will be re-checked against the
            workbook.
          </li>
        </ul>
        <div className="pt-4">
          <CardLink href="/records?review=needs-review">See every record needing review</CardLink>
        </div>
      </Card>

      <div className="flex flex-col gap-2 pb-2">
        <Rule>
          Data load: {dq.issues.errors === 0 ? "no errors" : `${formatNumber(dq.issues.errors)} errors`}
          {" · "}
          {dq.issues.warnings === 0 ? "no warnings" : `${formatNumber(dq.issues.warnings)} warning${dq.issues.warnings === 1 ? "" : "s"}`}
          {" · "}
          {formatNumber(overview.placeCount)} sites, {formatNumber(overview.speciesCount)} species, {overview.seasons.length} seasons loaded.
        </Rule>
        {dq.issues.warnings > 0 && warnings.length > 0 && (
          <details className="wrt-prov">
            <summary>Load warnings</summary>
            <ul className="m-0 mt-2 flex list-none flex-col gap-1 rounded-[var(--radius-field)] bg-[var(--surface-soft)] p-3 text-[var(--text-body)]">
              {warnings.map((w, i) => (
                <li key={i} className="break-words">{w}</li>
              ))}
              {dq.issues.warnings > warnings.length && (
                <li className="text-[var(--text-muted)]">Showing the first {warnings.length} of {formatNumber(dq.issues.warnings)}.</li>
              )}
            </ul>
          </details>
        )}
      </div>
    </>
  );
}
