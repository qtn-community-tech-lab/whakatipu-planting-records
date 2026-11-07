"use client";
/**
 * State, validation and submit for the planting-event form. The markup lives
 * in event-form.tsx; this hook holds what the form knows and does.
 *
 * Nothing is saved yet: submit runs the shared validator and, when every
 * field is right, marks the form as checked.
 */
import { useMemo, useState, type RefObject } from "react";
import type * as GeoJSON from "geojson";
import type { EventFormOptions } from "@/lib/wrt/events/form-options";
import { seasonFromDate } from "@/lib/wrt/events/season";
import type { EventSeason } from "@/lib/wrt/events/types";
import { validateEventInput, type EventLookups, type FieldErrors } from "@/lib/wrt/events/validate";
import { locationBounds, siteLocations } from "@/lib/wrt/site-locations";
import type { MapFocus, OtherArea } from "./draw-map";

export interface Line {
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

const isWholeAboveZero = (n: number) => Number.isInteger(n) && n > 0;

export function useEventForm({
  options, today, areas, formRef,
}: {
  options: EventFormOptions;
  /** NZ today, "YYYY-MM-DD" (from the server so it matches the validator). */
  today: string;
  areas: ExistingArea[];
  /** The form element, used only on submit to focus the first problem. */
  formRef: RefObject<HTMLFormElement | null>;
}) {
  const suggested = seasonFromDate(today)!;

  const [placeSlug, setPlaceSlug] = useState("");
  const [parcelId, setParcelId] = useState<string | null>(null);
  const [polygon, setPolygon] = useState<GeoJSON.Polygon | null>(null);
  const [plantedOn, setPlantedOn] = useState(today);
  const [season, setSeason] = useState<EventSeason>(suggested.season);
  const [seasonYear, setSeasonYear] = useState(String(suggested.seasonYear));
  // Once the user picks a season themselves, changing the date stops overwriting it.
  const [seasonChosen, setSeasonChosen] = useState(false);
  const [lines, setLines] = useState<Line[]>([{ key: 0, speciesId: "", quantity: "" }]);
  const [nextKey, setNextKey] = useState(1);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  // True after a submit that passed every check (nothing is saved).
  const [checked, setChecked] = useState(false);

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
  const errors: FieldErrors = submitted ? (() => {
    const r = validateEventInput(payload(), lookups, today);
    return r.ok ? {} : r.errors;
  })() : {};

  const focus: MapFocus = useMemo(() => {
    const atSite = siteLocations.filter((l) => l.siteSlug === placeSlug);
    const atPart = parcelId ? atSite.filter((l) => l.parcelIds?.includes(parcelId)) : [];
    const bounds = locationBounds(atPart.length ? atPart : atSite);
    return bounds ? { kind: "bounds", bounds } : { kind: "region" };
  }, [placeSlug, parcelId]);

  const others = useMemo(
    () => areas.filter((a) => a.placeSlug === placeSlug),
    [areas, placeSlug],
  );

  const total = lines.reduce((s, l) => s + (isWholeAboveZero(Number(l.quantity)) ? Number(l.quantity) : 0), 0);

  return {
    site, focus, others, total, errors, checked,
    /** The message for one field path (e.g. "species.0.quantity"), if it has one. */
    err: (path: string): string | undefined => errors[path],

    placeSlug,
    chooseSite(slug: string) { setPlaceSlug(slug); setParcelId(null); },
    parcelId, setParcelId,
    polygon, setPolygon,

    plantedOn,
    changeDate(value: string) {
      setPlantedOn(value);
      const s = seasonFromDate(value);
      if (s && !seasonChosen) {
        setSeason(s.season);
        setSeasonYear(String(s.seasonYear));
      }
    },
    season, seasonChosen,
    chooseSeason(value: EventSeason) { setSeason(value); setSeasonChosen(true); },
    seasonYear,
    changeSeasonYear(value: string) { setSeasonYear(value); setSeasonChosen(true); },

    lines,
    /** Species already picked on other lines, so a species can't be listed twice. */
    taken: (except: number) => new Set(lines.filter((l) => l.key !== except && l.speciesId).map((l) => l.speciesId)),
    updateLine(key: number, change: Partial<Line>) {
      setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...change } : l)));
    },
    removeLine(key: number) { setLines((ls) => ls.filter((l) => l.key !== key)); },
    addLine() {
      setLines((ls) => [...ls, { key: nextKey, speciesId: "", quantity: "" }]);
      setNextKey((k) => k + 1);
    },

    notes, setNotes,

    submit(e: React.FormEvent) {
      e.preventDefault();
      setSubmitted(true);
      const check = validateEventInput(payload(), lookups, today);
      setChecked(check.ok);
      if (!check.ok) {
        // Move focus to the first problem so keyboard and screen-reader users land on it.
        requestAnimationFrame(() =>
          formRef.current?.querySelector<HTMLElement>("[aria-invalid='true'], [data-invalid='true']")?.focus());
      }
    },
  };
}
