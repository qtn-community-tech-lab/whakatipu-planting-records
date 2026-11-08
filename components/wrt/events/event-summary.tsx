/**
 * A checked planting event in words, used on "Check and submit" and on the
 * "Not saved" preview. Pass `onChange` to add a "Change" button per group.
 */
import type { ReactNode } from "react";
import { STEP } from "@/lib/wrt/events/steps";
import type { EventSummary as Summary } from "@/lib/wrt/events/summary";
import { formatNumber } from "@/lib/wrt/text";
import { cn } from "@/lib/utils";

function Row({ term, children, className }: { term: ReactNode; children: ReactNode; className?: string }) {
  return <div className={cn("ev-summary__row", className)}><dt>{term}</dt><dd>{children}</dd></div>;
}

export function EventSummary({ summary, onChange }: { summary: Summary; onChange?: (step: number) => void }) {
  const group = (title: string, step: number, rows: ReactNode) => (
    <div className="ev-summary__group">
      <div className="ev-summary__head">
        <h3 className="cn-card__title cn-card__title--sm">{title}</h3>
        {onChange && (
          <button type="button" className="cn-btn cn-btn--soft cn-btn--sm" onClick={() => onChange(step)} aria-label={`Change ${title.toLowerCase()}`}>
            Change
          </button>
        )}
      </div>
      <dl className="ev-summary__list">{rows}</dl>
    </div>
  );

  return (
    <div className="ev-summary">
      {group("Where and when", STEP.whereWhen, <>
        <Row term="Site">{summary.site}</Row>
        <Row term="Part of site">{summary.part}</Row>
        <Row term="Planting date">{summary.date}</Row>
        <Row term="Season">{summary.season}</Row>
      </>)}
      {group("What was planted", STEP.whatPlanted, <>
        {summary.species.map((s, i) => <Row key={i} term={s.name} className="tabular-nums">{formatNumber(s.quantity)}</Row>)}
        <Row term="Total" className="ev-summary__total tabular-nums">{formatNumber(summary.total)} plants</Row>
        <Row term="Notes">{summary.notes ?? "None"}</Row>
      </>)}
    </div>
  );
}
