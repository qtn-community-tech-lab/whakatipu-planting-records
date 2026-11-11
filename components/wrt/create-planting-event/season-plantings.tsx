"use client";
/**
 * One past season at a site (or the chosen part), opened from its row in the site's seasons: the
 * season, where, and when, then each planting event that season with every species planted.
 * With `canEdit`, each event has Edit, which swaps it for its form in place (one at a time); the
 * footer then has Cancel and Save for it instead of Back and "Add new planting event".
 * It takes the panel's place; Back goes to whatever was showing, and "Add new planting event" opens the form.
 */
import { ArrowRight, MapPin, Pencil } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Fragment, useEffect, useRef, useState } from "react";
import { seasonPlantings, type SeasonPlantings as Plantings } from "@/app/playground/create-planting-event/actions";
import { Skeleton } from "@/components/ui/skeleton";
import type { SpeciesOption } from "@/lib/wrt/events/form-options";
import { formatPlantedOn, seasonAgo, seasonMonths } from "@/lib/wrt/events/season";
import { formatNumber } from "@/lib/wrt/text";
import f from "@/components/wrt/events/map-event-form.module.css";
import { editFormId, EditPlantingEvent } from "./edit-planting-event";
import { FigureList } from "@/components/wrt/shared/figure-list";
import { StatTiles } from "@/components/wrt/shared/stat-tiles";
import { useLoad } from "@/components/wrt/shared/use-load";
import s from "./season-plantings.module.css";

type Event = Plantings["events"][number];

/** Under the event's name: its date when it has one, how many species, and whether it came from the workbook. */
const plantsIn = (e: Event) => e.lines.reduce((t, l) => t + l.quantity, 0);
/** A species' share of its event, in per cent. */
const percent = (n: number, of: number) => (of ? (n / of) * 100 : 0);
const eventLine = (e: Event) =>
  [e.plantedOn && formatPlantedOn(e.plantedOn), `${e.lines.length} species`].filter(Boolean).join(" · ") + (e.workbook ? " · from the workbook" : "");

export function SeasonPlantings({ slug, parcelId, season, place, today, canEdit, species, onBack, onStart }: {
  slug: string; parcelId: string | null;
  season: { slug: string; label: string };
  /** The site, or "Site · Part". */
  place: string;
  /** NZ today, "YYYY-MM-DD": how long ago the season was, and the latest date an edit can have. */
  today: string;
  /** Shows Edit on each event. */
  canEdit?: boolean | undefined;
  /** The species register, for adding species to an event being edited. */
  species: SpeciesOption[];
  onBack: () => void; onStart: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  // Read again after a save.
  const { loading, failed, data, reload } = useLoad(`${slug}/${parcelId ?? ""}/${season.slug}`, () => seasonPlantings(slug, season.slug, parcelId));
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const events = data?.events ?? [];
  const total = events.reduce((t, e) => t + plantsIn(e), 0);
  const speciesCount = new Set(events.flatMap((e) => e.lines.map((l) => l.species))).size;
  const when = [seasonMonths(season.slug), seasonAgo(season.slug, today)].filter(Boolean).join(" · ");

  return (
    <div className={f.form}>
      <div className={f.scroll} aria-busy={loading}>
        <header className={s.head}>
          <h2 ref={heading} tabIndex={-1}>{season.label}</h2>
          <p>{place}</p>
          {when && <p>{when}</p>}
        </header>
        {loading ? (
          <div className="flex flex-col gap-2">
            <span className="sr-only">Loading this season&apos;s plantings</span>
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
          </div>
        ) : failed ? (
          <p className={f.quiet} role="alert">Couldn&apos;t load this season&apos;s plantings.</p>
        ) : events.length === 0 ? (
          <p className={f.quiet}>Nothing planted here this season.</p>
        ) : (
          <div className={s.events}>
            {/* The season at a glance. */}
            <StatTiles stats={[
              { label: "Plants", value: formatNumber(total) },
              { label: "Species", value: String(speciesCount) },
              { label: events.length === 1 ? "Site" : "Sites", value: String(events.length) },
            ]} />
            {events.map((e, i) => { const sum = plantsIn(e); return (
              <Fragment key={e.id}>
                {i > 0 && <hr className={s.rule} />}
                {editing === e.id ? (
                  <EditPlantingEvent
                    event={e} season={season} today={today} species={species}
                    onDone={() => setEditing(null)} onSaving={setSaving}
                    onSaved={() => { setEditing(null); reload(); }}
                  />
                ) : (
                  <FigureList
                    title={e.area}
                    head={
                      <div className="flex flex-col gap-2.5">
                        <div className={s.eventHead}>
                          <span className={s.eventIcon} aria-hidden="true"><MapPin size={18} strokeWidth={2.2} /></span>
                          <span className={s.eventText}><b>{e.area}</b><span>{eventLine(e)}</span></span>
                          <span className={s.eventTotal}><b>{formatNumber(sum)}</b><span>plants</span></span>
                        </div>
                        {canEdit && editing === null && (
                          <button type="button" className={s.edit} onClick={() => setEditing(e.id)} aria-label={`Edit ${e.area}`}>
                            <Pencil size={14} strokeWidth={2.4} aria-hidden="true" />Edit
                          </button>
                        )}
                      </div>
                    }
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
            <button type="button" className={f.next} onClick={onStart}>Add new planting event<ArrowRight size={18} strokeWidth={2.2} /></button>
          </>
        ) : (
          <>
            <button type="button" className={f.back} onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
            <button type="submit" form={editFormId(editing)} className={f.next} disabled={saving}>
              {saving ? <><Spinner aria-hidden="true" />Saving…</> : "Save"}
            </button>
          </>
        )}
      </footer>
    </div>
  );
}
