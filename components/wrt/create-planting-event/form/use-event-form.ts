"use client";
/**
 * State, validation and submit for the planting-event form (map-event-form.tsx). Submit checks
 * everything and, when it all passes, saves it with `save` (when given) and shows the receipt;
 * without `save` it shows a "Not saved" preview. Errors show from the first Submit on, and update live.
 */
import { unstable_rethrow } from "next/navigation";
import { useMemo, useState, type RefObject } from "react";
import type { PlantingEventSubmitResult } from "@/db/types";
import type { EventFormOptions } from "@/lib/wrt/events/form-options";
import { seasonFromDate } from "@/lib/wrt/events/season";
import type { EventSeason, PlantingEventInput } from "@/lib/wrt/events/types";
import { validateEventInput, type EventLookups, type FieldErrors } from "@/lib/wrt/events/validate";

export interface Line {
  /** Stable React key for the row (not stored). */
  key: number;
  speciesId: string;
  /** Kept as typed so a half-typed number is not reformatted under the cursor. */
  quantity: string;
}

export type EventFormState = ReturnType<typeof useEventForm>;

const isWholeAboveZero = (n: number) => Number.isInteger(n) && n > 0;

/** Focus an element once React has drawn the change that reveals it. */
const focusSoon = (pick: () => HTMLElement | null | undefined) => requestAnimationFrame(() => pick()?.focus());

export function useEventForm({
  options, today, formRef, headingRef, initialSite = "", initialPart = null, save,
}: {
  options: EventFormOptions;
  /** NZ today, "YYYY-MM-DD" (from the server so it matches the validator). */
  today: string;
  /** The form element, used to focus the first problem. */
  formRef: RefObject<HTMLFormElement | null>;
  /** The form's heading, focused when the preview closes. */
  headingRef: RefObject<HTMLHeadingElement | null>;
  /** Site slug to start on, e.g. when the form opens from the map at a site. */
  initialSite?: string;
  /** The part of that site to start on (its id), or null for the site as a whole. */
  initialPart?: string | null | undefined;
  /** Saves the checked event (a server action); `savedPlantingEvent` is passed back on a retry. Without it, Submit only previews. */
  save?: ((input: PlantingEventInput, savedPlantingEvent?: number) => Promise<PlantingEventSubmitResult>) | undefined;
}) {
  const suggested = seasonFromDate(today)!;

  const [siteSlug, setPlaceSlug] = useState(initialSite);
  const [partId, setParcelId] = useState<string | null>(initialPart);
  const [plantedOn, setPlantedOn] = useState(today);
  const [season, setSeason] = useState<EventSeason>(suggested.season);
  const [seasonYear, setSeasonYear] = useState(String(suggested.seasonYear));
  // Once the user picks a season themselves, changing the date stops overwriting it.
  const [seasonChosen, setSeasonChosen] = useState(false);
  const [lines, setLines] = useState<Line[]>([{ key: 0, speciesId: "", quantity: "" }]);
  const [nextKey, setNextKey] = useState(1);
  const [notes, setNotes] = useState("");

  // Submitted once: errors then show, and update live as the user fixes them.
  const [checked, setChecked] = useState(false);
  // The checked event once Submit passes: shown as the "Not saved" preview.
  const [preview, setPreview] = useState<PlantingEventInput | null>(null);
  // Saving: in progress, the general failure to show by Submit, and the event's id once its row
  // exists (sent back on retry so it isn't created twice).
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedPlantingEvent, setSavedPlantingEvent] = useState<number | undefined>(undefined);
  // Goes up each time problems are shown (Submit, or the server's), so the view can bring the first into sight.
  const [problemAsk, setProblemAsk] = useState(0);
  // Field problems the server found, for the input it was sent: they go once anything is edited.
  const [server, setServer] = useState<{ input: string; errors: FieldErrors } | null>(null);

  const site = options.sites.find((s) => s.slug === siteSlug);

  // Reference data for the client-side check: the same shape the server validates against.
  const lookups: EventLookups = useMemo(() => ({
    places: options.sites.map((s) => ({ slug: s.slug, isScheme: false, parcels: s.parts })),
    species: options.species,
  }), [options]);

  // Checked on every change (cheap); errors are shown once the form has been submitted.
  const input = {
    siteSlug,
    partId,
    plantedOn,
    season,
    seasonYear: seasonYear.trim() === "" ? null : Number(seasonYear),
    polygon: null, // drawn on the map once the map PR lands
    species: lines.map((l) => ({ speciesId: l.speciesId, quantity: l.quantity.trim() === "" ? null : Number(l.quantity) })),
    notes: notes.trim() || null,
  };
  const result = validateEventInput(input, lookups, today);
  const inputKey = JSON.stringify(input);
  const serverErrors = server?.input === inputKey ? server.errors : {};
  const allErrors: FieldErrors = { ...serverErrors, ...(result.ok ? {} : result.errors) };
  const errors = checked ? allErrors : {};

  const total = lines.reduce((s, l) => s + (isWholeAboveZero(Number(l.quantity)) ? Number(l.quantity) : 0), 0);

  const focusFirstProblem = () => focusSoon(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid='true'], [data-problem]"));

  /** Show the problems and bring the first into sight. */
  function showProblems() {
    setProblemAsk((n) => n + 1);
    setChecked(true);
    focusFirstProblem();
  }

  /** Check everything; save it (when the form saves) and show the receipt, or show what needs fixing. */
  async function finish() {
    if (!result.ok) return showProblems();
    if (!save) return setPreview(result.value);
    if (saving) return;
    const value = result.value;
    setSaving(true);
    setSaveError(null);
    let outcome: PlantingEventSubmitResult;
    try {
      outcome = await save(value, savedPlantingEvent);
    } catch (error) {
      unstable_rethrow(error);
      outcome = { error: "The planting event could not be saved. Your entries are still here; please try again." };
    } finally {
      setSaving(false);
    }
    if (outcome.savedPlantingEvent !== undefined) setSavedPlantingEvent(outcome.savedPlantingEvent);
    if (outcome.issues?.length) {
      const errs: FieldErrors = Object.fromEntries(outcome.issues.map((x) => [x.path, x.message]));
      setServer({ input: inputKey, errors: errs });
      return showProblems();
    }
    if (outcome.error) return setSaveError(outcome.error);
    setPreview(value);
  }

  return {
    site, total, errors, problemAsk,
    /** The message for one field path (e.g. "species.0.quantity"), if it has one. */
    err: (path: string): string | undefined => errors[path],

    /** The checked event for "Check and submit", or null while something needs fixing. */
    checkedEvent: result.ok ? result.value : null,
    preview,
    /** Saving now; the general save failure (shown by Submit); true once the event and its plants are saved. */
    // With `save`, the receipt only shows once everything is saved.
    saving, saveError, saved: !!save && preview !== null,
    /** The event's row was saved but not its plants: a retry only adds the plants, so where and when can't change now. */
    partlySaved: savedPlantingEvent !== undefined && preview === null,
    /** Leave the preview and return to the form, values kept. */
    closePreview() {
      setPreview(null);
      focusSoon(() => headingRef.current);
    },

    siteSlug,
    chooseSite(slug: string) { setPlaceSlug(slug); setParcelId(null); },
    partId, setParcelId,

    plantedOn,
    changeDate(value: string) {
      setPlantedOn(value);
      const s = seasonFromDate(value);
      if (s && !seasonChosen) {
        setSeason(s.season);
        setSeasonYear(String(s.seasonYear));
      }
    },
    season,
    chooseSeason(value: EventSeason) { setSeason(value); setSeasonChosen(true); },
    seasonYear,
    changeSeasonYear(value: string) { setSeasonYear(value); setSeasonChosen(true); },

    lines,
    updateLine(key: number, change: Partial<Line>) {
      setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...change } : l)));
    },
    removeLine(key: number) { setLines((ls) => ls.filter((l) => l.key !== key)); },
    addLine() {
      setLines((ls) => [...ls, { key: nextKey, speciesId: "", quantity: "" }]);
      setNextKey((k) => k + 1);
    },
    /** Add a species in one go (the map view's species rows): fills the empty line if there is one. */
    addSpecies(speciesId: string, quantity = "") {
      setLines((ls) => {
        if (ls.some((l) => l.speciesId === speciesId)) return ls;
        const empty = ls.find((l) => !l.speciesId);
        if (empty) return ls.map((l) => (l === empty ? { ...l, speciesId, quantity } : l));
        return [...ls, { key: nextKey, speciesId, quantity }];
      });
      setNextKey((k) => k + 1);
    },

    notes, setNotes,

    /** Enter or the main button. */
    submit(e: React.FormEvent) {
      e.preventDefault();
      void finish();
    },
  };
}
