/**
 * About the data › threatened marks. WRT marks species threatened in two lists
 * that disagree, and neither records which threat list or year it follows.
 * This section shows every marked species and the questions WRT has to answer.
 */
import Link from "next/link";
import type { ThreatenedSpeciesRow } from "@/lib/wrt/queries";
import { formatNumber } from "@/lib/wrt/text";
import { Badge } from "@/components/ui/badge";
import { SpeciesName } from "@/components/wrt/shared/names";
import { QuantityCell } from "@/components/wrt/shared/quantity";
import { midSentence } from "@/components/wrt/species/species-meta";

function Mark({ on }: { on: boolean }) {
  return on ? (
    <span className="font-extrabold text-[var(--text-brand)]" aria-label="Marked">✓</span>
  ) : (
    <span className="cn-num--empty" aria-label="Not marked">–</span>
  );
}

export function ThreatenedTable({ rows }: { rows: ThreatenedSpeciesRow[] }) {
  return (
    <div className="wrt-table-wrap">
      <table className="wrt-table">
        <caption className="sr-only">Species WRT marks threatened, by list</caption>
        <thead>
          <tr>
            <th>Species</th>
            <th className="!text-center">Plants Out Master (T)</th>
            <th className="!text-center">Te Kakano list (#)</th>
            <th>Lists agree?</th>
            <th className="cn-num">Recorded plants</th>
            <th className="cn-num">Sites</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.item.id} className={r.agreed ? undefined : "is-review"}>
              <td>
                {r.split.records > 0 ? <SpeciesName species={r.item} link /> : <SpeciesName species={r.item} />}
              </td>
              <td className="text-center"><Mark on={r.item.threatenedMarks.plantsOutMaster} /></td>
              <td className="text-center"><Mark on={r.item.threatenedMarks.teKakano} /></td>
              <td>
                {r.agreed ? (
                  <Badge tone="soft">Both mark it</Badge>
                ) : (
                  <Badge tone="review">
                    {r.item.threatenedMarks.plantsOutMaster ? "Plants Out Master only" : "Te Kakano only"}
                  </Badge>
                )}
              </td>
              <td className="cn-num">
                {r.split.records > 0 ? <QuantityCell split={r.split} /> : <span className="wrt-muted">Not in the history</span>}
              </td>
              <td className="cn-num">{r.placeCount ? formatNumber(r.placeCount) : "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ThreatenedQuestions({ rows }: { rows: ThreatenedSpeciesRow[] }) {
  const teOnly = rows.filter((r) => r.item.threatenedMarks.teKakano && !r.item.threatenedMarks.plantsOutMaster);
  const poOnly = rows.filter((r) => r.item.threatenedMarks.plantsOutMaster && !r.item.threatenedMarks.teKakano);
  const names = (rs: ThreatenedSpeciesRow[]) => {
    const list = rs.map((r) => (r.item.displayIsScientific ? r.item.displayName : midSentence(r.item.displayName)));
    return list.length > 1 ? `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}` : list.join("");
  };
  return (
    <ol className="wrt-prose m-0 flex list-decimal flex-col gap-2 pl-5 marker:font-bold marker:text-[var(--text-eyebrow)]">
      <li>
        <strong>Which threat list, and which year, does the mark follow?</strong> For example the national threat
        classification for plants, and its edition. Without that, nobody can check a mark or keep it up to date.
      </li>
      {teOnly.length > 0 && (
        <li>
          <strong>Should {names(teOnly)} be marked?</strong> The Te Kakano list marks {teOnly.length === 1 ? "it" : "them"};
          the Plants Out Master does not.
        </li>
      )}
      {poOnly.length > 0 && (
        <li>
          <strong>Should the {poOnly.length} species marked only in the Plants Out Master stay marked?</strong> They are{" "}
          {names(poOnly)}.
        </li>
      )}
      <li>
        <strong>Is the yearly threatened-plants count reported to anyone</strong> (DOC, the council, a funder)? The
        workbook counted it from 2015 to 2023 and then stopped.
      </li>
    </ol>
  );
}

export function ThreatenedLink() {
  return (
    <Link href="/species?show=threatened" className="cn-link">
      See the marked species in the species list →
    </Link>
  );
}
