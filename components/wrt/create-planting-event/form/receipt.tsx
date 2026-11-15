"use client";
/** What Submit shows: the receipt. */
import { MapPin } from "lucide-react";
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { FigureList } from "@/components/wrt/shared/figure-list";
import { WHOLE_SITE, type EventSummary } from "@/lib/wrt/events/summary";
import { formatNumber, partBesideSite } from "@/lib/wrt/text";
import { cn } from "@/lib/utils";
import s from "../panel.module.css";
import * as panel from "../panel-classes";

/** The place planted (its pin), and what went in there. */
export interface PlaceCard { key: string; title: string; total: number }
const plantsLabel = (n: number) => `${formatNumber(n)} ${n === 1 ? "plant" : "plants"}`;
const cardLead = <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-row)] bg-[var(--surface-soft)] text-[var(--cn-green-800)]"><MapPin size={20} strokeWidth={2.2} /></span>;

/** What Submit shows: a short receipt, marked "Saved", or plainly "Not saved" when the form can't save. */
export function Receipt({ hidden, summary, cards, saved, onBack, onStartAnother, onFinish }: {
  hidden?: boolean | undefined;
  summary: EventSummary; cards: PlaceCard[];
  /** The event and its plants were saved: no going back to the form (it would save them again). */
  saved: boolean;
  onBack: () => void; onStartAnother: () => void;
  /** Saved: out of the form, e.g. to the site's page, where the new planting shows. */
  onFinish?: { label: string; onClick: () => void } | undefined;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  const where = summary.part === WHOLE_SITE ? summary.site : `${summary.site} · ${partBesideSite(summary.part, summary.site)}`;
  return (
    <div className={cn(panel.form, s.slideIn)} hidden={hidden}>
      <header className={panel.head}>
        <Badge tone={saved ? "ok" : "review"} className="self-start">{saved ? "Saved" : "Not saved"}</Badge>
        <h2 ref={headingRef} tabIndex={-1} className={panel.title}>1 planting event</h2>
        <p className={panel.context} role="status">
          <span>{saved ? "The planting event and its plants are saved." : "Everything checks out. This prototype can’t store events yet."}</span>
        </p>
      </header>
      <div className={panel.scroll}>
        <p className="m-0 font-sans text-[15px] leading-[1.4] font-normal text-[var(--text-strong)] [&_b]:font-extrabold [&_span]:mt-0.5 [&_span]:block [&_span]:text-[13.5px] [&_span]:text-[var(--text-muted)]">
          <b>{plantsLabel(summary.total)}</b> at {where}
          <span>{summary.date} · {summary.season}</span>
        </p>
        <FigureList title="Where" rows={cards.map((c) => ({ key: c.key, name: c.title, lead: cardLead, figure: plantsLabel(c.total) }))} />
      </div>
      <footer className={panel.foot}>
        {!saved && <button type="button" className={panel.back} onClick={onBack}>Back to the form</button>}
        {saved && onFinish && <button type="button" className={panel.back} onClick={onFinish.onClick}>{onFinish.label}</button>}
        <button type="button" className={panel.next} onClick={onStartAnother}>Start another</button>
      </footer>
    </div>
  );
}
