import type { Metadata } from "next";
import Link from "next/link";
import { getWrt } from "@/lib/wrt/server";
import { Card, PageHead, Rule } from "@/components/wrt/shared/page";
import { hrefs } from "@/components/wrt/shared/names";
import { ConfidenceList, PrecisionList } from "@/components/wrt/about/precision";
import { SeasonReconciliationTable } from "@/components/wrt/about/reconciliation";
import { ThreatenedLink, ThreatenedQuestions, ThreatenedTable } from "@/components/wrt/about/threatened";
import { formatNumber } from "@/lib/wrt/text";

export const metadata: Metadata = {
  title: "About the data",
  description: "How to read every number in the WRT planting history: what a recorded plant is, where the history comes from, and how the totals check out.",
};

const SECTIONS = [
  { id: "recorded", label: "Recorded, not verified" },
  { id: "threatened", label: "Threatened marks" },
  { id: "precision", label: "How precise" },
  { id: "totals", label: "Checked against WRT’s totals" },
  { id: "source", label: "Where it comes from" },
  { id: "limits", label: "What this version does not do" },
];

export default async function AboutTheData() {
  // Explain totals and provenance for the complete history.
  const wrt = getWrt();
  const [dq, overview] = await Promise.all([wrt.dataQuality(), wrt.overview()]);
  const { split } = dq;

  const seasonRows = dq.reconciliation.filter((r) => r.kind === "season");
  const seasonsMatching = seasonRows.filter((r) => r.difference === 0).length;
  const seasonsMatchAll = seasonRows.length > 0 && seasonsMatching === seasonRows.length;

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
            record is, how precise the history can be, and how the totals check against WRT’s own
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
        foot="Bars are drawn to the same scale within each list."
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
        </ul>
      </Card>

      <Rule>
        {formatNumber(overview.siteCount)} active sites, {formatNumber(overview.speciesCount)} active species, {overview.seasons.length} seasons loaded.
      </Rule>
    </>
  );
}
