"use client";
/**
 * The planting-event form, for both "New planting event" and "Edit".
 *
 * Fields: site → optional part of site → map (draw one area) → planting date →
 * season and year (suggested from the date, editable) → species lines with
 * quantities → photo (disabled until storage exists) → notes.
 *
 * Validation runs here with the same validator the server uses, so most
 * mistakes show before submitting; the Server Action re-checks everything.
 */
import { useId, useMemo, useState, useTransition } from "react";
import type * as GeoJSON from "geojson";
import { saveEvent } from "@/app/events/actions";
import type { EventFormOptions } from "@/lib/wrt/events/form-options";
import { seasonFromDate } from "@/lib/wrt/events/season";
import { EVENT_SEASONS, type EventSeason, type PlantingEvent } from "@/lib/wrt/events/types";
import { NOTES_MAX, validateEventInput, type EventLookups, type FieldErrors } from "@/lib/wrt/events/validate";
import { locationBounds, siteLocations } from "@/lib/wrt/site-locations";
import { formatNumber } from "@/lib/wrt/text";
import { cn } from "@/lib/utils";
import { DrawMap, type MapFocus, type OtherArea } from "./draw-map";
import { SpeciesPicker } from "./species-picker";

interface Line {
  /** Stable React key for the row (not stored). */
  key: number;
  speciesId: string;
  /** Kept as typed so a half-typed number is not reformatted under the cursor. */
  quantity: string;
}

/** Saved areas at any site, labelled; the map shows the ones at the chosen site. */
export interface ExistingArea extends OtherArea {
  placeSlug: string;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <span id={id} className="ev-error" role="alert">{message}</span>;
}

export function EventForm({
  options, event, today, areas,
}: {
  options: EventFormOptions;
  /** The event being edited, or null for a new one. */
  event: PlantingEvent | null;
  /** NZ today, "YYYY-MM-DD" (from the server so it matches the validator). */
  today: string;
  areas: ExistingArea[];
}) {
  const uid = useId();
  const f = (name: string) => `${uid}-${name}`;
  const suggested = seasonFromDate(event?.plantedOn ?? today)!;

  const [placeSlug, setPlaceSlug] = useState(event?.placeSlug ?? "");
  const [parcelId, setParcelId] = useState<string | null>(event?.parcelId ?? null);
  const [polygon, setPolygon] = useState<GeoJSON.Polygon | null>(event?.polygon ?? null);
  const [plantedOn, setPlantedOn] = useState(event?.plantedOn ?? today);
  const [season, setSeason] = useState<EventSeason>(event?.season ?? suggested.season);
  const [seasonYear, setSeasonYear] = useState(String(event?.seasonYear ?? suggested.seasonYear));
  // Once the user picks a season themselves, changing the date stops overwriting it.
  const [seasonChosen, setSeasonChosen] = useState(event !== null);
  const [lines, setLines] = useState<Line[]>(() =>
    event ? event.species.map((s, i) => ({ key: i, speciesId: s.speciesId, quantity: String(s.quantity) })) : [{ key: 0, speciesId: "", quantity: "" }]);
  const [nextKey, setNextKey] = useState(lines.length);
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  const site = options.sites.find((s) => s.slug === placeSlug);

  // Reference data for the client-side check: the same shape the server validates against.
  const lookups: EventLookups = useMemo(() => ({
    places: options.sites.map((s) => ({ slug: s.slug, isScheme: false, parcels: s.parts })),
    species: options.species,
  }), [options]);

  const payload = () => ({
    placeSlug,
    parcelId,
    plantedOn,
    season,
    seasonYear: seasonYear.trim() === "" ? null : Number(seasonYear),
    polygon,
    species: lines.map((l) => ({ speciesId: l.speciesId, quantity: l.quantity.trim() === "" ? null : Number(l.quantity) })),
    notes: notes.trim() || null,
  });

  // After the first submit attempt, errors update live as the user fixes them.
  const liveErrors = submitted ? (() => {
    const r = validateEventInput(payload(), lookups, today);
    return r.ok ? {} : r.errors;
  })() : {};
  const shown: FieldErrors = { ...liveErrors, ...(errors.form ? { form: errors.form } : {}) };

  const focus: MapFocus = useMemo(() => {
    const atSite = siteLocations.filter((l) => l.siteSlug === placeSlug);
    const atPart = parcelId ? atSite.filter((l) => l.parcelIds?.includes(parcelId)) : [];
    const bounds = locationBounds(atPart.length ? atPart : atSite);
    return bounds ? { kind: "bounds", bounds } : { kind: "region" };
  }, [placeSlug, parcelId]);

  const others = useMemo(
    () => areas.filter((a) => a.placeSlug === placeSlug && a.id !== event?.id),
    [areas, placeSlug, event?.id],
  );

  const total = lines.reduce((s, l) => s + (Number.isInteger(Number(l.quantity)) && Number(l.quantity) > 0 ? Number(l.quantity) : 0), 0);
  const taken = (except: number) => new Set(lines.filter((l) => l.key !== except && l.speciesId).map((l) => l.speciesId));

  function changeDate(value: string) {
    setPlantedOn(value);
    const s = seasonFromDate(value);
    if (s && !seasonChosen) {
      setSeason(s.season);
      setSeasonYear(String(s.seasonYear));
    }
  }

  function updateLine(key: number, change: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...change } : l)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setErrors({});
    const check = validateEventInput(payload(), lookups, today);
    if (!check.ok) {
      // Move focus to the first problem so keyboard and screen-reader users land on it.
      requestAnimationFrame(() => document.querySelector<HTMLElement>(".ev-form [aria-invalid='true'], .ev-form [data-invalid='true']")?.focus());
      return;
    }
    startTransition(async () => {
      // On success the action redirects to the list, so a return value means errors.
      const result = await saveEvent(event?.id ?? null, payload());
      if (result && !result.ok) setErrors(result.errors);
    });
  }

  const err = (path: string) => shown[path];
  const invalid = (path: string) => (err(path) ? true : undefined);

  return (
    <form className="ev-form" onSubmit={submit} noValidate aria-label={event ? "Edit planting event" : "New planting event"}>
      {Object.keys(shown).length > 0 && (
        <div className="cn-callout cn-callout--risk cn-callout--sm" role="alert">
          {shown.form ?? "Some details need fixing before this can be saved. They are marked below."}
        </div>
      )}

      <section className="cn-card ev-section" aria-labelledby={f("where")}>
        <h2 id={f("where")} className="cn-card__title">Where</h2>
        <div className="ev-grid">
          <div className="cn-field">
            <label className="cn-field__label" htmlFor={f("site")}>Site</label>
            <select
              id={f("site")} className="wrt-select" value={placeSlug}
              aria-invalid={invalid("placeSlug")} aria-describedby={f("site-err")}
              onChange={(e) => { setPlaceSlug(e.target.value); setParcelId(null); }}
            >
              <option value="">Choose a site</option>
              {options.sites.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
            <FieldError id={f("site-err")} message={err("placeSlug")} />
          </div>
          <div className="cn-field">
            <label className="cn-field__label" htmlFor={f("part")}>Part of site <span className="wrt-muted">(optional)</span></label>
            <select
              id={f("part")} className="wrt-select" value={parcelId ?? ""} disabled={!site || site.parts.length < 2}
              aria-invalid={invalid("parcelId")} aria-describedby={f("part-err")}
              onChange={(e) => setParcelId(e.target.value || null)}
            >
              <option value="">{!site ? "Choose a site first" : site.parts.length < 2 ? "This site has one part" : "The site as a whole"}</option>
              {site && site.parts.length > 1 && site.parts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <FieldError id={f("part-err")} message={err("parcelId")} />
          </div>
        </div>

        <div className="cn-field">
          <span className="cn-field__label" id={f("area")}>Planted area</span>
          <div role="group" aria-labelledby={f("area")} aria-describedby={f("area-err")} data-invalid={invalid("polygon")} tabIndex={err("polygon") ? -1 : undefined}>
            <DrawMap polygon={polygon} onChange={setPolygon} focus={focus} others={others} invalid={!!err("polygon")} />
          </div>
          <FieldError id={f("area-err")} message={err("polygon") ?? err("polygon.coordinates")} />
        </div>
      </section>

      <section className="cn-card ev-section" aria-labelledby={f("when")}>
        <h2 id={f("when")} className="cn-card__title">When</h2>
        <div className="ev-grid ev-grid--3">
          <div className="cn-field">
            <label className="cn-field__label" htmlFor={f("date")}>Planting date</label>
            <input
              id={f("date")} type="date" className="cn-input" value={plantedOn} max={today}
              aria-invalid={invalid("plantedOn")} aria-describedby={f("date-err")}
              onChange={(e) => changeDate(e.target.value)}
            />
            <FieldError id={f("date-err")} message={err("plantedOn")} />
          </div>
          <div className="cn-field">
            <label className="cn-field__label" htmlFor={f("season")}>Season</label>
            <select
              id={f("season")} className="wrt-select" value={season}
              aria-invalid={invalid("season")} aria-describedby={f("season-hint")}
              onChange={(e) => { setSeason(e.target.value as EventSeason); setSeasonChosen(true); }}
            >
              {EVENT_SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span id={f("season-hint")} className="cn-field__hint">
              {seasonChosen ? "Chosen by you." : "Suggested from the date; change it if WRT counts this planting differently."}
            </span>
          </div>
          <div className="cn-field">
            <label className="cn-field__label" htmlFor={f("year")}>Season year</label>
            <input
              id={f("year")} type="number" inputMode="numeric" className="cn-input" value={seasonYear} min={2015} max={2100}
              aria-invalid={invalid("seasonYear")} aria-describedby={f("year-err")}
              onChange={(e) => { setSeasonYear(e.target.value); setSeasonChosen(true); }}
            />
            <FieldError id={f("year-err")} message={err("seasonYear")} />
          </div>
        </div>
      </section>

      <section className="cn-card ev-section" aria-labelledby={f("what")}>
        <div className="cn-card__head">
          <h2 id={f("what")} className="cn-card__title">What was planted</h2>
          <span className="wrt-muted tabular-nums" aria-live="polite">{formatNumber(total)} plants</span>
        </div>
        <ol className="ev-lines">
          {lines.map((l, i) => (
            <li key={l.key} className="ev-line">
              <div className="cn-field ev-line__species">
                <label className="cn-field__label" htmlFor={f(`sp-${l.key}`)}>Species</label>
                <SpeciesPicker
                  id={f(`sp-${l.key}`)} species={options.species} value={l.speciesId} taken={taken(l.key)}
                  invalid={!!err(`species.${i}.speciesId`)} describedBy={f(`sp-${l.key}-err`)}
                  onChange={(speciesId) => updateLine(l.key, { speciesId })}
                />
                <FieldError id={f(`sp-${l.key}-err`)} message={err(`species.${i}.speciesId`)} />
              </div>
              <div className="cn-field ev-line__qty">
                <label className="cn-field__label" htmlFor={f(`qty-${l.key}`)}>Quantity</label>
                <input
                  id={f(`qty-${l.key}`)} type="number" inputMode="numeric" min={1} step={1} className="cn-input tabular-nums"
                  value={l.quantity} placeholder="0"
                  aria-invalid={invalid(`species.${i}.quantity`)} aria-describedby={f(`qty-${l.key}-err`)}
                  onChange={(e) => updateLine(l.key, { quantity: e.target.value })}
                />
                <FieldError id={f(`qty-${l.key}-err`)} message={err(`species.${i}.quantity`)} />
              </div>
              <button
                type="button" className="cn-btn cn-btn--soft cn-btn--sm ev-line__remove"
                disabled={lines.length === 1}
                aria-label={`Remove species line ${i + 1}`}
                onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
              >
                Remove
              </button>
            </li>
          ))}
        </ol>
        <FieldError id={f("species-err")} message={err("species")} />
        <div>
          <button
            type="button" className="cn-btn cn-btn--secondary cn-btn--sm"
            onClick={() => { setLines((ls) => [...ls, { key: nextKey, speciesId: "", quantity: "" }]); setNextKey((k) => k + 1); }}
          >
            Add another species
          </button>
        </div>
      </section>

      <section className="cn-card ev-section" aria-labelledby={f("more")}>
        <h2 id={f("more")} className="cn-card__title">Photo and notes</h2>
        <div className="cn-field">
          <label className="cn-field__label" htmlFor={f("photo")}>Photo <span className="wrt-muted">(optional)</span></label>
          <input id={f("photo")} type="file" accept="image/*" disabled className="ev-file" aria-describedby={f("photo-hint")} />
          <span id={f("photo-hint")} className="cn-field__hint">Photo upload will be available once photo storage is connected.</span>
        </div>
        <div className="cn-field">
          <label className="cn-field__label" htmlFor={f("notes")}>Notes <span className="wrt-muted">(optional)</span></label>
          <textarea
            id={f("notes")} className="cn-input ev-notes" rows={3} maxLength={NOTES_MAX} value={notes}
            placeholder="Who planted, conditions, anything WRT should know"
            aria-invalid={invalid("notes")} aria-describedby={f("notes-err")}
            onChange={(e) => setNotes(e.target.value)}
          />
          <FieldError id={f("notes-err")} message={err("notes")} />
        </div>
      </section>

      <div className={cn("ev-actions", pending && "opacity-70")}>
        <button type="submit" className="cn-btn cn-btn--primary" disabled={pending}>
          {pending ? "Saving…" : event ? "Save changes" : total ? `Record ${formatNumber(total)} plants` : "Record planting event"}
        </button>
      </div>
    </form>
  );
}
