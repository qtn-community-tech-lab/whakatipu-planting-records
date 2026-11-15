"use client";
/** What Submit shows (Receipt), and a new location added on its own (LocationPreview). */
import { MapPin } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { AreaShape } from "@/components/wrt/shared/area-shape";
import { FigureList } from "@/components/wrt/shared/figure-list";
import { WHOLE_SITE, type EventSummary } from "@/lib/wrt/events/summary";
import { formatNumber, partBesideSite } from "@/lib/wrt/text";
import { cn } from "@/lib/utils";
import type { DrawnArea } from "./use-event-form";
import s from "../panel.module.css";
import * as panel from "../panel-classes";

/** One place planted: a drawn area (its outline), or the site as a whole (its pin). Each is, in effect, a planting event. */
export interface PlaceCard { key: string; title: string; sub?: string | undefined; pts?: DrawnArea["pts"] | undefined; total: number }
const plantsLabel = (n: number) => `${formatNumber(n)} ${n === 1 ? "plant" : "plants"}`;
const cardLead = (c: PlaceCard) => (c.pts ? <AreaShape pts={c.pts} size={44} onMap /> : <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-row)] bg-[var(--surface-soft)] text-[var(--cn-green-800)]"><MapPin size={20} strokeWidth={2.2} /></span>);

/** What Submit shows: a short receipt, marked "Saved", or plainly "Not saved" when the form can't save. */
export function Receipt({ hidden, summary, cards, empty, saved, unstored, areasDrawn, onBack, onStartAnother, onFinish }: {
  hidden?: boolean | undefined;
  /** Areas were drawn: they aren't stored yet, so it says so. */
  areasDrawn: boolean;
  /** Said under the heading: what of it isn't stored (a new location's own record). */
  unstored?: string | undefined;
  summary: EventSummary; cards: PlaceCard[];
  /** Areas kept with no plants (their names): said in a line, so they aren't silently dropped. */
  empty: string[];
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
        <h2 ref={headingRef} tabIndex={-1} className={panel.title}>{saved || cards.length === 1 ? "1 planting event" : `${cards.length} planting events`}</h2>
        <p className={panel.context} role="status">
          <span>{saved ? `The planting event and its plants are saved.${areasDrawn ? " Drawn areas aren’t stored yet." : ""}` : "Everything checks out. This prototype can’t store events yet."}</span>
          {unstored && <span>{unstored}</span>}
        </p>
      </header>
      <div className={panel.scroll}>
        <p className="m-0 font-sans text-[15px] leading-[1.4] font-normal text-[var(--text-strong)] [&_b]:font-extrabold [&_span]:mt-0.5 [&_span]:block [&_span]:text-[13.5px] [&_span]:text-[var(--text-muted)]">
          <b>{plantsLabel(summary.total)}</b> at {where}
          <span>{summary.date} · {summary.season}</span>
        </p>
        <FigureList title="Where" rows={cards.map((c) => ({ key: c.key, name: c.title, sub: c.sub, lead: cardLead(c), figure: plantsLabel(c.total) }))} />
        {empty.length > 0 && <p className={panel.quiet}>{listed(empty)} kept with no plants.</p>}
      </div>
      <footer className={panel.foot}>
        {!saved && <button type="button" className={panel.back} onClick={onBack}>Back to the form</button>}
        {saved && onFinish && <button type="button" className={panel.back} onClick={onFinish.onClick}>{onFinish.label}</button>}
        <button type="button" className={panel.next} onClick={onStartAnother}>Start another</button>
      </footer>
    </div>
  );
}

/** Add location only: the new location on its own, with no planting. Not saved. */
export function LocationPreview({ hidden, name, what, plantedArea, onBack, onSave }: {
  hidden?: boolean | undefined; name: string; what: string; plantedArea?: ReactNode | undefined; onBack: () => void;
  /** Keeps the location for this visit (a place to choose, marked "Not saved yet"). */
  onSave: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  return (
    <div className={cn(panel.form, s.slideIn)} hidden={hidden}>
      <header className={panel.head}>
        <Badge tone="review" className="self-start">Not saved</Badge>
        <h2 ref={headingRef} tabIndex={-1} className={panel.title}>New location preview</h2>
        <p className={panel.context} role="status"><span>No planting yet: that can be added later. This prototype can’t store locations yet.</span></p>
      </header>
      <div className={panel.scroll}>
        {plantedArea}
        <FigureList
          title="Where"
          rows={[{ key: "spot", name: name || "Not named yet", sub: what, figure: "No plants yet", lead: <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-row)] bg-[var(--surface-soft)] text-[var(--cn-green-800)]"><MapPin size={20} strokeWidth={2.2} /></span> }]}
        />
      </div>
      <footer className={panel.foot}>
        <button type="button" className={panel.back} onClick={onBack}>Back to the form</button>
        <button type="button" className={panel.next} onClick={onSave}>Save location</button>
      </footer>
    </div>
  );
}

/** "A", "A and B", "A, B and C". */
function listed(names: string[]) {
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}