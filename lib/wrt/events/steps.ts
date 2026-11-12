/**
 * The planting-event form's three steps, and which fields each one owns.
 *
 * Validation stays in one place (validateEventInput); the form runs it whole
 * and uses these helpers to show only the errors that belong to the current
 * step, or to find the first step that still has a problem.
 */
import type { PlantingEventInput } from "./types";
import type { FieldErrors } from "./validate";

export interface EventStep {
  title: string;
  /** Top-level fields entered on this step. */
  fields: readonly (keyof PlantingEventInput)[];
}

export const EVENT_STEPS: readonly EventStep[] = [
  { title: "Where and when", fields: ["placeSlug", "parcelId", "polygon", "plantedOn", "season", "seasonYear"] },
  { title: "What was planted", fields: ["species", "notes"] },
  { title: "Check and submit", fields: [] },
];

/** The map form is one page: every field, checked together on Submit. */
export const MAP_EVENT_STEPS: readonly EventStep[] = [
  { title: "New planting event", fields: ["placeSlug", "parcelId", "polygon", "plantedOn", "season", "seasonYear", "species", "notes"] },
];

/** Each step's position in EVENT_STEPS, for code that links to a particular step. */
export const STEP = { whereWhen: 0, whatPlanted: 1, check: 2 } as const;

export const LAST_STEP = EVENT_STEPS.length - 1;

/** The step that owns an error path ("species.2.quantity" → step 1). Errors no step owns ("form") go to the first. */
function stepOfError(path: string, steps: readonly EventStep[] = EVENT_STEPS): number {
  const field = path.split(".")[0];
  const i = steps.findIndex((s) => s.fields.some((f) => f === field));
  return i === -1 ? 0 : i;
}

/** Only the errors that belong to one step. */
export function errorsForStep(errors: FieldErrors, step: number, steps: readonly EventStep[] = EVENT_STEPS): FieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([path]) => stepOfError(path, steps) === step));
}

/** The earliest step with an error, or null when there are none. */
export function firstStepWithError(errors: FieldErrors, steps: readonly EventStep[] = EVENT_STEPS): number | null {
  const at = Object.keys(errors).map((path) => stepOfError(path, steps));
  return at.length ? Math.min(...at) : null;
}
