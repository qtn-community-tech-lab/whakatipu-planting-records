"use client";
/**
 * State, validation and submit for the planting-event form (map-event-form.tsx): React Hook Form, checked with the
 * server's own schema (eventSchema). Submit checks everything and, when it all passes, saves it with `save` (when
 * given) and shows the receipt; without `save` it shows a "Not saved" preview. Errors show from the first Submit on,
 * and update live.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { unstable_rethrow } from "next/navigation";
import { useMemo, useState, type FormEvent, type RefObject } from "react";
import { useFieldArray, useForm, useWatch, type FieldPath } from "react-hook-form";
import { z } from "zod";
import type { PlantingEventSubmitResult } from "@/db/types";
import type { EventFormOptions } from "@/lib/wrt/events/form-options";
import { seasonFromDate } from "@/lib/wrt/events/season";
import type { PlantingEventInput } from "@/lib/wrt/events/types";
import { eventSchema, type EventLookups } from "@/lib/wrt/events/validate";

/** What the controls hold, as the event the server takes: quantities as typed (a half-typed number isn't reformatted), the date's season. */
const formSchema = (lookups: EventLookups, today: string) => z.object({
  siteSlug: z.string(),
  partId: z.string().nullable(),
  plantedOn: z.string(),
  species: z.array(z.object({ speciesId: z.string(), quantity: z.string() })),
  notes: z.string(),
}).transform((v): unknown => ({
  ...v,
  season: seasonFromDate(v.plantedOn)?.season,
  seasonYear: seasonFromDate(v.plantedOn)?.seasonYear ?? null,
  polygon: null, // drawn areas aren't stored yet
  species: v.species.map((l) => ({ ...l, quantity: l.quantity === "" ? null : Number(l.quantity) })),
  notes: v.notes.trim() || null,
})).pipe(eventSchema(lookups, today));

type FormValues = z.input<ReturnType<typeof formSchema>>;
export type EventFormState = ReturnType<typeof useEventForm>;

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
  // Reference data for the check: the same shape the server validates against.
  const lookups: EventLookups = useMemo(() => ({
    places: options.sites.map((s) => ({ slug: s.slug, isScheme: false, parcels: s.parts })),
    species: options.species,
  }), [options]);
  const schema = useMemo(() => formSchema(lookups, today), [lookups, today]);
  const form = useForm<FormValues, unknown, PlantingEventInput>({
    resolver: zodResolver(schema), mode: "onSubmit", reValidateMode: "onChange", shouldFocusError: false,
    defaultValues: { siteSlug: initialSite, partId: initialPart, plantedOn: today, species: [], notes: "" },
  });
  const { control, formState } = form;
  const lines = useFieldArray({ control, name: "species" });
  const [siteSlug, partId, species, notes] = useWatch({ control, name: ["siteSlug", "partId", "species", "notes"] });

  // The checked event once Submit passes: shown as the "Not saved" preview, or the receipt once saved.
  const [preview, setPreview] = useState<PlantingEventInput | null>(null);
  // The general save failure to show by Submit, and the event's id once its row exists (sent back on retry so it isn't created twice).
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedPlantingEvent, setSavedPlantingEvent] = useState<number | undefined>(undefined);
  // Goes up each time problems are shown (Submit, or the server's), so the view can bring the first into sight.
  const [problemAsk, setProblemAsk] = useState(0);
  // The species rows aren't inputs the form knows, so once submitted a change to the lines checks them all again (errors stay live).
  const thenCheck = <A extends unknown[]>(change: (...a: A) => void) => (...a: A) => {
    change(...a);
    if (form.formState.isSubmitted) void form.trigger("species");
  };

  /** Show the problems and bring the first into sight. */
  function showProblems() {
    setProblemAsk((n) => n + 1);
    focusSoon(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid='true'], [data-problem]"));
  }

  /** Save the checked event (when the form saves) and show the receipt, or show what needs fixing. */
  async function finish(value: PlantingEventInput) {
    if (!save) return setPreview(value);
    setSaveError(null);
    let outcome: PlantingEventSubmitResult;
    try {
      outcome = await save(value, savedPlantingEvent);
    } catch (error) {
      unstable_rethrow(error);
      outcome = { error: "The planting event could not be saved. Your entries are still here; please try again." };
    }
    if (outcome.savedPlantingEvent !== undefined) setSavedPlantingEvent(outcome.savedPlantingEvent);
    if (outcome.issues?.length) {
      // The season comes from the date, so its problem is the date's.
      for (const { path, message } of outcome.issues) form.setError((path.startsWith("season") ? "plantedOn" : path) as FieldPath<FormValues>, { message });
      return showProblems();
    }
    if (outcome.error) return setSaveError(outcome.error);
    setPreview(value);
  }

  return {
    control, errors: formState.errors, problemAsk, notes,
    site: options.sites.find((s) => s.slug === siteSlug),
    siteSlug, partId,
    /** The site (and part) picked on the map. */
    chooseSite(slug: string, part: string | null) {
      const opts = { shouldValidate: form.formState.isSubmitted };
      form.setValue("siteSlug", slug, opts);
      form.setValue("partId", part, opts);
    },

    /** The species lines, as typed, and changing them. */
    lines: species, append: thenCheck(lines.append), update: thenCheck(lines.update), remove: thenCheck(lines.remove),
    preview,
    /** Saving now; the general save failure (shown by Submit); true once the event and its plants are saved. */
    saving: formState.isSubmitting, saveError, saved: !!save && preview !== null,
    /** The event's row was saved but not its plants: a retry only adds the plants, so where and when can't change now. */
    partlySaved: savedPlantingEvent !== undefined && preview === null,
    /** Leave the preview and return to the form, values kept. */
    closePreview() {
      setPreview(null);
      focusSoon(() => headingRef.current);
    },
    /** Enter or the main button. */
    submit(e: FormEvent) { void form.handleSubmit(finish, showProblems)(e); },
  };
}
