import type { Metadata } from "next";
import Link from "next/link";
import { getWrtAll, reviewShown } from "@/lib/wrt/server";
import { Card, CardLink, PageHead, Rule } from "@/components/wrt/shared/page";
import { QuantityFigure } from "@/components/wrt/shared/quantity";
import { ReviewThemeList } from "@/components/wrt/shared/records";
import { hrefs } from "@/components/wrt/shared/names";
import { ConfidenceList, PrecisionList } from "@/components/wrt/about/precision";
import { SeasonReconciliationTable } from "@/components/wrt/about/reconciliation";
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
  // This page explains the whole history, so it always counts every record, whatever the review switch says.
  const wrt = getWrtAll();
  const [dq, overview, showReview] = await Promise.all([wrt.dataQuality(), wrt.overview(), reviewShown()]);
  const { split } = dq;

  const seasonRows = dq.reconciliation.filter((r) => r.kind === "season");
  const seasonsMatching = seasonRows.filter((r) => r.difference === 0).length;
  const seasonsMatchAll = seasonRows.length > 0 && seasonsMatching === seasonRows.length;

  const themeSum = dq.themes.reduce((a, t) => a + t.split.needsReview, 0);
  const themeRecordSum = dq.themes.reduce((a, t) => a + t.split.recordsNeedingReview, 0);

  const areaRows = dq.byPrecision.find((r) => r.item === "area");
  const marked = dq.threatened;
  const markedBoth = marked.filter((r) => r.agreed).length;
  const markedPo = marked.filter((r) => r.item.threatenedMarks.plantsOutMaster).length;
  const markedTe = marked.filter((r) => r.item.threatenedMarks.teKakano).length;

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

      {!showReview && (
        <p className="cn-callout cn-callout--note cn-callout--sm m-0" role="note">
          <span>
            <b>This page counts every record.</b> The rest of the app is showing confirmed records only:{" "}
            {formatNumber(split.resolved)} recorded plants on {formatNumber(split.records - split.recordsNeedingReview)} records.
            Turn on “Needs review” in the top bar to see the other {formatNumber(split.needsReview)} everywhere, and to
            follow the links below to them.
          </span>
        </p>
      )}

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
                Detail below the level of a parcel is recorded on {formatNumber(areaRows.split.records)}{" "}
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
      </Card>

      <Card id="source" title="Where the data comes from">
        <div className="wrt-grid wrt-grid--main-rail">
          <div className="wrt-prose">
            <p className="[overflow-wrap:anywhere]">{dq.source.description}</p>
            <p>
              <strong>Every record keeps its origin.</strong> It carries the site, species and season exactly as they
              were typed, plus the source workbook, sheet and cell. Open <strong>Source</strong> on any row of a record
              table to see them, for example{" "}
              <Link href={hrefs.records({})} className="cn-link">
                the planting records
              </Link>
              .
            </p>
            <p className="!m-0">
              The app reads the Supabase database. The workbook history was imported separately, and every record
              keeps the source cell it came from.
            </p>
          </div>
          <div className="flex flex-col gap-2" role="list" aria-label="Database tables read, with row counts">
            {dq.source.tables.map((f) => (
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

      <Rule>
        {formatNumber(overview.placeCount)} sites, {formatNumber(overview.speciesCount)} species, {overview.seasons.length} seasons loaded.
      </Rule>
    </>
  );
}
