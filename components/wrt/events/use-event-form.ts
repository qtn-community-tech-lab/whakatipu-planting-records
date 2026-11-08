"use client";
/**
 * State, validation and submit for the planting-event form. The markup lives
 * in event-form.tsx; this hook holds what the form knows and does.
 *
 * Three steps (lib/wrt/events/steps.ts). Next checks only the current step's
 * fields; Submit on the last step checks everything and, when it all passes,
 * shows a "Not saved" preview. Nothing is saved yet.
 */
import { useMemo, useState, type RefObject } from "react";
import type { EventFormOptions } from "@/lib/wrt/events/form-options";
import { seasonFromDate } from "@/lib/wrt/events/season";
import { errorsForStep, firstStepWithError, LAST_STEP } from "@/lib/wrt/events/steps";
import type { EventSeason, PlantingEventInput } from "@/lib/wrt/events/types";
import { validateEventInput, type EventLookups, type FieldErrors } from "@/lib/wrt/events/validate";

export interface Line {
  /** Stable React key for the row (not stored). */
  key: number;
  speciesId: string;
  /** Kept as typed so a half-typed number is not reformatted under the cursor. */
  quantity: string;
  /** The drawn area these plants went into (the record sheet's area id), or none. */
  area?: number;
}

export type EventFormState = ReturnType<typeof useEventForm>;

const isWholeAboveZero = (n: number) => Number.isInteger(n) && n > 0;

/** Focus an element once React has drawn the change that reveals it. */
const focusSoon = (pick: () => HTMLElement | null | undefined) => requestAnimationFrame(() => pick()?.focus());

export function useEventForm({
  options, today, formRef, headingRef, initialPlace = "",
}: {
  options: EventFormOptions;
  /** NZ today, "YYYY-MM-DD" (from the server so it matches the validator). */
  today: string;
  /** The form element, used to focus the first problem. */
  formRef: RefObject<HTMLFormElement | null>;
  /** The current step's heading, focused when the step changes. */
  headingRef: RefObject<HTMLHeadingElement | null>;
  /** Site slug to start on, e.g. when the form opens from the map at a site. */
  initialPlace?: string;
}) {
  const suggested = seasonFromDate(today)!;

  const [placeSlug, setPlaceSlug] = useState(initialPlace);
  const [parcelId, setParcelId] = useState<string | null>(null);
  const [plantedOn, setPlantedOn] = useState(today);
  const [season, setSeason] = useState<EventSeason>(suggested.season);
  const [seasonYear, setSeasonYear] = useState(String(suggested.seasonYear));
  // Once the user picks a season themselves, changing the date stops overwriting it.
  const [seasonChosen, setSeasonChosen] = useState(false);
  const [lines, setLines] = useState<Line[]>([{ key: 0, speciesId: "", quantity: "" }]);
  const [nextKey, setNextKey] = useState(1);
  const [notes, setNotes] = useState("");

  const [step, setStep] = useState(0);
  // The furthest step reached: steps up to it can be revisited from the indicator.
  const [furthest, setFurthest] = useState(0);
  // Steps whose fields have been checked; their errors then update live as the user fixes them.
  const [checkedSteps, setCheckedSteps] = useState<ReadonlySet<number>>(new Set());
  // The checked event once Submit passes: shown as the "Not saved" preview.
  const [preview, setPreview] = useState<PlantingEventInput | null>(null);

  const site = options.sites.find((s) => s.slug === placeSlug);

  // Reference data for the client-side check: the same shape the server validates against.
  const lookups: EventLookups = useMemo(() => ({
    places: options.sites.map((s) => ({ slug: s.slug, isScheme: false, parcels: s.parts })),
    species: options.species,
  }), [options]);

  // Checked on every change (cheap); errors are shown only for checked steps.
  const result = validateEventInput({
    placeSlug,
    parcelId,
    plantedOn,
    season,
    seasonYear: seasonYear.trim() === "" ? null : Number(seasonYear),
    polygon: null, // drawn on the map once the map PR lands
    species: lines.map((l) => ({ speciesId: l.speciesId, quantity: l.quantity.trim() === "" ? null : Number(l.quantity), ...(l.area === undefined ? {} : { area: l.area }) })),
    notes: notes.trim() || null,
  }, lookups, today);
  const allErrors: FieldErrors = result.ok ? {} : result.errors;
  const errors = checkedSteps.has(step) ? errorsForStep(allErrors, step) : {};

  const total = lines.reduce((s, l) => s + (isWholeAboveZero(Number(l.quantity)) ? Number(l.quantity) : 0), 0);

  const markChecked = (s: number) => setCheckedSteps((prev) => new Set(prev).add(s));
  const show = (s: number) => { setStep(s); setFurthest((f) => Math.max(f, s)); };
  const focusFirstProblem = () => focusSoon(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']"));

  /** Go to a step and move focus to its heading. */
  function goTo(s: number) {
    show(s);
    focusSoon(() => headingRef.current);
  }

  /** Check the current step; move on when its fields are right. */
  function next() {
    markChecked(step);
    if (Object.keys(errorsForStep(allErrors, step)).length) focusFirstProblem();
    else goTo(step + 1);
  }

  /** Check everything; show the preview, or go to the first step with a problem. */
  function finish() {
    if (result.ok) {
      setPreview(result.value);
      return;
    }
    const s = firstStepWithError(result.errors) ?? 0;
    markChecked(s);
    show(s);
    focusFirstProblem();
  }

  return {
    site, total, errors,
    /** The message for one field path (e.g. "species.0.quantity"), if it has one. */
    err: (path: string): string | undefined => errors[path],

    step, furthest, goTo,
    back() { goTo(step - 1); },
    /** The checked event for "Check and submit", or null while something needs fixing. */
    checkedEvent: result.ok ? result.value : null,
    /** Go to the first step with a problem (or the preview, if there is none). */
    showFirstProblem: finish,
    preview,
    /** Leave the preview and return to the last step, values kept. */
    closePreview() {
      setPreview(null);
      focusSoon(() => headingRef.current);
    },

    placeSlug,
    chooseSite(slug: string) { setPlaceSlug(slug); setParcelId(null); },
    parcelId, setParcelId,

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
    /** Species already picked on other lines (in the same area), so a species can't be listed twice. */
    taken: (except: number) => {
      const area = lines.find((l) => l.key === except)?.area;
      return new Set(lines.filter((l) => l.key !== except && l.speciesId && l.area === area).map((l) => l.speciesId));
    },
    updateLine(key: number, change: Partial<Line>) {
      setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...change } : l)));
    },
    removeLine(key: number) { setLines((ls) => ls.filter((l) => l.key !== key)); },
    addLine() {
      setLines((ls) => [...ls, { key: nextKey, speciesId: "", quantity: "" }]);
      setNextKey((k) => k + 1);
    },
    /** Add a species in one go (the map view's species rows), in an area if given: fills the empty line if there is one. */
    addSpecies(speciesId: string, quantity = "", area?: number) {
      setLines((ls) => {
        if (ls.some((l) => l.speciesId === speciesId && l.area === area)) return ls;
        const empty = ls.find((l) => !l.speciesId);
        if (empty) return ls.map((l) => (l === empty ? { ...l, speciesId, quantity, area } : l));
        return [...ls, { key: nextKey, speciesId, quantity, area }];
      });
      setNextKey((k) => k + 1);
    },
    /**
     * Keep the lines in step with the drawn areas (their ids, in order): a line whose area is gone,
     * or that has none, moves to the first area, adding to that species there if it's already listed.
     * With no areas, lines have none. Nothing typed is lost.
     */
    keepAreas(ids: readonly number[]) {
      setLines((ls) => {
        const target = (l: Line) => (ids.length === 0 ? undefined : l.area !== undefined && ids.includes(l.area) ? l.area : ids[0]);
        if (ls.every((l) => l.area === target(l))) return ls;
        const out: Line[] = [];
        for (const l of ls) {
          const area = target(l);
          const same = l.speciesId ? out.find((o) => o.speciesId === l.speciesId && o.area === area) : undefined;
          if (same) same.quantity = String((Number(same.quantity) || 0) + (Number(l.quantity) || 0));
          else out.push({ ...l, area });
        }
        return out;
      });
    },

    notes, setNotes,

    /** Enter or the main button: Next on the first steps, Submit on the last. */
    submit(e: React.FormEvent) {
      e.preventDefault();
      if (step < LAST_STEP) next();
      else finish();
    },
  };
}
