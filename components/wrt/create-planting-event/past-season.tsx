"use client";
/**
 * One past season at a site (or the chosen part), opened from its row in the site's seasons, under the
 * site's header (which names the season): its totals, then each planting event, its where and every species planted.
 * With `canEdit`, each event has Edit, which swaps it for its form in place (one at a time); Edit
 * turns to Cancel, and the footer has Save instead of Back and "Add new planting event".
 * It takes the panel's place; Back goes to whatever was showing, and "Add new planting event" opens the form.
 */
import { ArrowRight, MapPin, Pencil, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { loadSeasonPlantingEvents, type SeasonPlantingEvents as Plantings } from "@/app/playground/create-planting-event/actions";
import { Skeleton } from "@/components/ui/skeleton";
import type { SpeciesOption } from "@/lib/wrt/events/form-options";
import { formatPlantedOn } from "@/lib/wrt/events/season";
import { formatNumber } from "@/lib/wrt/text";
import f from "@/components/wrt/events/map-event-form.module.css";
import { editFormId, EditPlantingEvent } from "./edit-planting-event";
import { FigureList } from "@/components/wrt/shared/figure-list";
import { StatTiles } from "@/components/wrt/shared/stat-tiles";
import { useLoad } from "@/components/wrt/shared/use-load";
import s from "./past-season.module.css";

type Event = Plantings["events"][number];

const plantsIn = (e: Event) => e.lines.reduce((t, l) => t + l.quantity, 0);
/** A species' share of its event, in per cent. */
const percent = (n: number, of: number) => (of ? (n / of) * 100 : 0);
/** Under the event's name: its date when it has one, how many species and its plants. */
const eventLine = (e: Event, on: string | null) =>
  [on && formatPlantedOn(on), `${e.lines.length} species`, `${formatNumber(plantsIn(e))} plants`]
    .filter(Boolean).join(" · ");

export function PastSeason({ slug, parcelId, season, today, canEdit, species, actionSlot, hidden, onHeaderButton, onDirty, onSaving, onBack, onStart, startLabel = "Add new planting event" }: {
  slug: string; parcelId: string | null;
  season: { slug: string; label: string };
  /** NZ today, "YYYY-MM-DD": how long ago the season was, and the latest date an edit can have. */
  today: string;
  /** Shows Edit on each event. */
  canEdit?: boolean | undefined;
  /** The panel header's place for a button: one event's Edit (Cancel while it's edited) goes there. */
  actionSlot?: HTMLElement | null | undefined;
  /** Says whether there's a button for that place (one event, and Edit allowed), so the host only makes room for one then. */
  onHeaderButton?: ((has: boolean) => void) | undefined;
  /** Kept mounted but out of sight while something shows over it (the site list, an area's sheet), so an edit survives. */
  hidden?: boolean | undefined;
  /** Whether the event being edited has changes not saved yet. */
  onDirty?: ((dirty: boolean) => void) | undefined;
  /** While an edit is being saved (the browser's back waits). */
  onSaving?: ((saving: boolean) => void) | undefined;
  /** The species register, for adding species to an event being edited. */
  species: SpeciesOption[];
  onBack: () => void; onStart: () => void;
  /** The start button's words: "Back to your planting event" when one with entries is waiting. */
  startLabel?: string | undefined;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  // Read again after a save.
  const { loading, failed, data, reload } = useLoad(`${slug}/${parcelId ?? ""}/${season.slug}`, () => loadSeasonPlantingEvents(slug, season.slug, parcelId));
  useEffect(() => heading.current?.focus(), []);
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  // Whether the event being edited has changes: the footer's Save says Done until it has.
  const [dirty, setDirty] = useState(false);
  const reportDirty = useCallback((d: boolean) => { setDirty(d); onDirty?.(d); }, [onDirty]);
  // A save was tried: Cancel reads the season again, as part of it may have been written.
  const tried = useRef(false);
  const busy = (b: boolean) => { setSaving(b); onSaving?.(b); if (b) tried.current = true; };
  const cancel = () => { setEditing(null); if (tried.current) reload(); tried.current = false; };
  // Read again (after a save), the last plantings stay up meanwhile: no skeletons, the header's Edit stays, the scroll stays.
  const [kept, setKept] = useState(data);
  if (data && data !== kept) setKept(data);
  const shown = data ?? kept;
  const firstLoad = loading && !shown;
  // Read again, or failed to: what shows may be out of date, so it can't be edited (saving it could undo the last save).
  const stale = !data;
  const events = shown?.events ?? [];
  const total = events.reduce((t, e) => t + plantsIn(e), 0);
  const speciesCount = new Set(events.flatMap((e) => e.lines.map((l) => l.species))).size;
  const single = events.length === 1;
  const hasButton = single && !!canEdit;
  useEffect(() => {
    onHeaderButton?.(hasButton);
    return () => onHeaderButton?.(false);
  }, [hasButton, onHeaderButton]);
  // An event's where, with the pin like the panel's other headers, and Edit on the right.
  // While it's edited: the form's date, its pencil at the end of the line, and Cancel where Edit was.
  const head = (e: Event, edit?: { plantedOn: string; pencil: ReactNode }) => {
    const on = edit ? edit.plantedOn : e.plantedOn;
    const button = edit ? (
      <button type="button" className={s.edit} onClick={cancel} disabled={saving}>
        <X size={14} strokeWidth={2.4} aria-hidden="true" />Cancel
      </button>
    ) : canEdit && editing === null && (
      <button type="button" className={s.edit} onClick={() => setEditing(e.id)} disabled={stale} aria-label={`Edit ${e.area}`}>
        <Pencil size={14} strokeWidth={2.4} aria-hidden="true" />Edit
      </button>
    );
    // One event: Edit up in the panel's header; a row at the top (the tiles say its plants and species)
    // with its place, when the header says "Whole site", and its date.
    if (single) {
      const line = [!parcelId && e.area, on ? formatPlantedOn(on) : edit && "No date"].filter(Boolean).join(" · ");
      const inRow = !actionSlot && button;
      return (
        <>
          {(line || inRow) && <div className={s.topRow}><span>{line}{edit && <> {edit.pencil}</>}</span>{inRow}</div>}
          {actionSlot && button && createPortal(button, actionSlot)}
        </>
      );
    }
    return (
      <div className={s.eventHead}>
        <span className={s.eventIcon} aria-hidden="true"><MapPin size={18} strokeWidth={2.2} /></span>
        <span className={s.eventText}>
          <b>{e.area}</b>
          <span>{eventLine(e, on)}{edit && <> {edit.pencil}</>}</span>
        </span>
        {button}
      </div>
    );
  };

  return (
    <div className={f.form} hidden={hidden}>
      <div className={f.scroll} aria-busy={loading}>
        {/* The panel's header says the site and the season. */}
        <h2 ref={heading} tabIndex={-1} className="sr-only">{season.label}</h2>
        {firstLoad ? (
          <div className="flex flex-col gap-2">
            <span className="sr-only">Loading this season&apos;s plantings</span>
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
          </div>
        ) : failed && (
          // Over the last plantings when there are some: they stay, but may be out of date.
          <div className="cn-callout cn-callout--risk cn-callout--sm" role="alert">
            Couldn&apos;t load this season&apos;s plantings.{" "}
            <button type="button" className="cn-btn cn-btn--soft cn-btn--sm" onClick={reload}>Try again</button>
          </div>
        )}
        {firstLoad || !shown ? null : events.length === 0 ? (
          <p className={f.quiet}>Nothing planted here this season.</p>
        ) : (
          <div className={s.events}>
            {/* One event: its row, then the tiles (hidden while it's edited, so the form is under its row).
                Several: the season at a glance, then each event, its where, then its plants. */}
            {single && editing === null && head(events[0]!)}
            {!(single && editing !== null) && <StatTiles stats={[
              { label: "Plants", value: formatNumber(total) },
              { label: "Species", value: String(speciesCount) },
              // Each is one planting event (an area's planting that season).
              { label: single ? "Planting" : "Plantings", value: String(events.length) },
            ]} />}
            {events.map((e, i) => { const sum = plantsIn(e); return (
              <Fragment key={e.id}>
                {i > 0 && <hr className={s.rule} />}
                {editing === e.id ? (
                  <EditPlantingEvent
                    event={e} season={season} today={today} species={species} head={(edit) => head(e, edit)}
                    onDone={cancel} onSaving={busy} onDirty={reportDirty}
                    onSaved={() => { tried.current = false; setEditing(null); reload(); }}
                  />
                ) : (
                  <FigureList
                    title={e.area}
                    head={single ? <></> : head(e)}
                    // Every species, most planted first: its other name under it, its share of the event beside it.
                    rows={e.lines.map((l) => ({
                      key: l.id, name: l.name, italic: l.italic, photo: l.photo, figure: formatNumber(l.quantity), share: percent(l.quantity, sum),
                      sub: l.second ? (l.secondItalic ? <i>{l.second}</i> : l.second) : undefined,
                    }))}
                  >
                    {e.notes && <p className={s.note}>{e.notes}</p>}
                  </FigureList>
                )}
              </Fragment>
            ); })}
          </div>
        )}
      </div>
      <footer className={f.foot}>
        {editing === null ? (
          <>
            <button type="button" className={f.back} onClick={onBack}>Back</button>
            <button type="button" className={f.next} onClick={onStart}>{startLabel}<ArrowRight size={18} strokeWidth={2.2} /></button>
          </>
        ) : (
          <>
            {/* Cancel is beside the event, where Edit was. */}
            <button type="submit" form={editFormId(editing)} className={f.next} disabled={saving}>
              {saving ? <><Spinner aria-hidden="true" />Saving…</> : dirty ? "Save" : "Done"}
            </button>
          </>
        )}
      </footer>
    </div>
  );
}
