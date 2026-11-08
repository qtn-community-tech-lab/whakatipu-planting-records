/**
 * One validator for planting events. The form uses it to show errors as the
 * user types. Once events are saved, the server must run it again before
 * storing anything: Server Actions are public POST endpoints, so everything
 * from the browser is untrusted.
 *
 * Two layers:
 *   1. eventInputSchema — shape and value rules (zod). No data needed.
 *   2. validateEventInput — the schema plus reference checks against the
 *      species register and site list (the place exists and is a real site,
 *      the parcel belongs to it, every species exists, no duplicates), and
 *      "not in the future".
 *
 * Errors come back keyed by field path ("species.2.quantity") so the form can
 * put each message next to its field.
 */
import { z } from "zod";
import { SLUG } from "../text";
import { isClosed, ringSelfIntersects } from "./geo";
import { isIsoDate } from "./season";
import { EVENT_SEASONS, type PlantingEventInput } from "./types";

/** Notes are free text; keep them to a sensible length. */
export const NOTES_MAX = 2000;
/** A hand-drawn polygon with more corners than this is almost certainly a mistake (or abuse). */
const MAX_CORNERS = 500;
/** No single species line should be larger than this (the biggest historical record is far smaller). */
const MAX_QUANTITY = 100_000;

const position = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]).rest(z.number()); // GeoJSON allows an optional altitude; it is ignored.

const polygon = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(position)).length(1, { error: "Draw exactly one area, with no holes." }),
}).superRefine((p, ctx) => {
  const ring = p.coordinates[0];
  if (!ring) return;
  if (ring.length < 4) {
    ctx.addIssue({ code: "custom", message: "An area needs at least three corners.", path: [] });
  } else if (ring.length > MAX_CORNERS) {
    ctx.addIssue({ code: "custom", message: `An area can have at most ${MAX_CORNERS - 1} corners.`, path: [] });
  } else if (!isClosed(ring)) {
    ctx.addIssue({ code: "custom", message: "The area's outline is not closed.", path: [] });
  } else if (ringSelfIntersects(ring)) {
    ctx.addIssue({ code: "custom", message: "The area's outline crosses itself. Redraw it without crossing lines.", path: [] });
  }
});

export const eventInputSchema = z.object({
  placeSlug: z.string().regex(SLUG, { error: "Choose a site." }),
  parcelId: z.string().min(1).max(80).nullable(),
  plantedOn: z.string().refine(isIsoDate, { error: "Enter a valid planting date." }),
  season: z.enum(EVENT_SEASONS, { error: "Choose a season." }),
  seasonYear: z.number({ error: "Enter the season's year." }).int().min(2015, { error: "The year must be 2015 or later." }).max(2100),
  // Optional until the map PR adds drawing; a drawn area is still checked in full.
  polygon: polygon.nullable(),
  species: z.array(z.object({
    speciesId: z.string().min(1, { error: "Choose a species." }).max(80),
    quantity: z.number({ error: "Enter how many were planted." })
      .int({ error: "Use a whole number." })
      .positive({ error: "Must be at least 1." })
      .max(MAX_QUANTITY, { error: `At most ${MAX_QUANTITY.toLocaleString("en-NZ")} per species.` }),
    area: z.number().int().nonnegative().optional(),
  })).min(1, { error: "Add at least one species." }).max(200),
  notes: z.string().max(NOTES_MAX, { error: `Keep notes under ${NOTES_MAX} characters.` }).nullable(),
});

/** The minimum the reference checks need: works with the server's Lookups or a client-side copy. */
export interface EventLookups {
  places: { slug: string; isScheme: boolean; parcels: { id: string }[] }[];
  species: { id: string }[];
}

export type FieldErrors = Record<string, string>;

export type ValidationResult =
  | { ok: true; value: PlantingEventInput }
  | { ok: false; errors: FieldErrors };

/**
 * Validate an event from the browser.
 * @param today "YYYY-MM-DD" in NZ (see todayInNz); planting dates after it are rejected.
 */
export function validateEventInput(raw: unknown, lookups: EventLookups, today: string): ValidationResult {
  const errors: FieldErrors = {};
  const add = (path: string, message: string) => { if (!errors[path]) errors[path] = message; };

  const parsed = eventInputSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) add(issue.path.join(".") || "form", issue.message);
    return { ok: false, errors };
  }
  const v = parsed.data;

  // ISO dates compare correctly as strings.
  if (v.plantedOn > today) add("plantedOn", "The planting date can't be in the future.");

  const place = lookups.places.find((p) => p.slug === v.placeSlug);
  if (!place) add("placeSlug", "That site is not in the site list.");
  else if (place.isScheme) add("placeSlug", "Order schemes are not a physical site; choose the site where the planting happened.");
  else if (v.parcelId !== null && !place.parcels.some((p) => p.id === v.parcelId)) {
    add("parcelId", "That part does not belong to the chosen site.");
  }

  const known = new Set(lookups.species.map((s) => s.id));
  const seen = new Set<string>();
  // A species once per event, or once per drawn area when it has areas.
  v.species.forEach((line, i) => {
    const key = `${line.area ?? ""}:${line.speciesId}`;
    if (!known.has(line.speciesId)) add(`species.${i}.speciesId`, "That species is not in the register.");
    else if (seen.has(key)) add(`species.${i}.speciesId`, "This species is already listed; add the quantities together.");
    seen.add(key);
  });

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      ...v,
      // Drop any altitude so stored shapes are always [lon, lat].
      polygon: v.polygon && { type: "Polygon", coordinates: [v.polygon.coordinates[0].map((p) => [p[0], p[1]])] },
      notes: v.notes?.trim() || null,
    },
  };
}
