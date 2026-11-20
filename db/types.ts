/**
 * The Supabase client type every query takes. The table and view types come from
 * database.types.ts, generated from the database by `npm run db:types`: never edit it by hand.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "./database.types";
import { z } from "zod";
import { INPUT_LIMITS, lengthMessage } from "@/lib/forms/limits";
import { isIsoDate } from "@/lib/wrt/events/season";

export type { Database, Tables };
export type Db = SupabaseClient<Database>;

const text = z.string().trim().max(INPUT_LIMITS.shortText, lengthMessage(INPUT_LIMITS.shortText));
const identifier = z.string().trim().max(INPUT_LIMITS.identifier, lengthMessage(INPUT_LIMITS.identifier));
const notes = z.string().trim().max(INPUT_LIMITS.longText, lengthMessage(INPUT_LIMITS.longText));
const photoUrl = z.string()
  .max(INPUT_LIMITS.url, lengthMessage(INPUT_LIMITS.url))
  .pipe(z.union([
    z.url({ protocol: /^https$/i, error: "Enter a valid HTTPS URL." }),
    z.string().regex(/^\/species\/[a-z0-9-]+\.webp$/, "Use a species image path or HTTPS URL."),
  ]));

export const loginEmailSchema = z.string()
  .max(INPUT_LIMITS.shortText, lengthMessage(INPUT_LIMITS.shortText))
  .trim()
  .pipe(z.email({ error: "Enter a valid email address." }))
  .transform((email) => email.toLowerCase());

export const userSchema = z.object({
  name: text.min(1, "Enter a name."),
  email: loginEmailSchema,
});

export type UserInput = z.infer<typeof userSchema>;
export type UserRecord = Pick<Tables<"users">, "id" | "name" | "email" | "deactivated_at">;
export type UserSubmitResult = { error?: string; issues?: { path: string; message: string }[] };

/** Writable species data, validated in both page submit handlers. */
export const speciesSchema = z.object({
  slug: identifier.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens.")
    .refine((value) => !["new", "photos"].includes(value), "This slug is reserved. Choose another."),
  scientific_name: text.min(1, "Enter a scientific name."),
  suggested_spelling: text.nullable(), common_name: text.nullable(), maori_name: text.nullable(),
  status: z.enum(["core", "appended", "contested", "seedlog_only"]).nullable(),
  over_5m: z.boolean().nullable(), threatened: z.boolean().nullable(),
  threatened_te_kakano: z.boolean(), needs_decision: z.boolean().transform((): boolean => false),
  contested_group: identifier.regex(/^(C[0-9]+)?$/, "Use a group such as C3, or leave blank.").nullable(),
  register_note: notes.nullable(),
  photos: z.array(z.object({ src: photoUrl, attribution: text })),
});

export type SpeciesInput = z.infer<typeof speciesSchema>;
export type SpeciesEdit = Pick<Tables<"species">, keyof SpeciesInput | "updated_at">;
export type SpeciesSubmitResult = { error?: string; issues?: { path: string; message: string }[] };

export const editPlantingAreaSchema = z.object({
  name: text.min(1, "Enter an area name."),
  description: notes,
});

export const createPlantingAreaSchema = editPlantingAreaSchema.extend({
  slug: identifier.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens."),
});

export const plantingAreaFormSchema = createPlantingAreaSchema.extend({ existing: z.boolean() });

const uniqueAreaSlugs = <T extends { slug: string }>(areas: T[], ctx: z.RefinementCtx) => {
  const seen = new Set<string>();
  areas.forEach(({ slug }, index) => {
    if (seen.has(slug)) ctx.addIssue({ code: "custom", path: [index, "slug"], message: "Each area needs a unique slug." });
    seen.add(slug);
  });
};

export const editSiteSchema = z.object({
  name: text.min(1, "Enter a site name."),
  description: notes,
  areas: z.array(plantingAreaFormSchema).superRefine(uniqueAreaSlugs),
});

export const createSiteSchema = editSiteSchema.extend({
  slug: identifier.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens.")
    .refine((value) => value !== "new", "This slug is reserved. Choose another."),
  areas: z.array(createPlantingAreaSchema).superRefine(uniqueAreaSlugs),
});

export type CreatePlantingAreaInput = z.infer<typeof createPlantingAreaSchema>;
export type EditPlantingAreaInput = z.infer<typeof editPlantingAreaSchema>;
export type PlantingAreaFormValues = z.infer<typeof plantingAreaFormSchema>;
export type PlantingAreaEdit = Pick<Tables<"areas">, "slug" | "site" | "name" | "description" | "updated_at">;

export type CreateSiteInput = z.infer<typeof createSiteSchema>;
export type EditSiteInput = z.infer<typeof editSiteSchema>;
export type SiteEdit = Pick<Tables<"sites">, "slug" | "name" | "description" | "updated_at">;

export type SiteSubmitResult = {
  error?: string;
  issues?: { path: string; message: string }[];
  savedAreas?: { index: number; slug: string }[];
  savedSiteSlug?: string;
};
/** A planting event's save: `savedPlantingEvent` once the event row exists, even if its plants failed (sent back on retry). */
export type PlantingEventSubmitResult = { error?: string; issues?: { path: string; message: string }[]; savedPlantingEvent?: number };

/**
 * A past planting event's writable fields, as its edit form sends them. A line's `id` is its
 * planting_lines id, or null for a species added in the form; `species` is the event form's species
 * id (the register code, or the slug when there is none). Lines left out are deactivated. The date
 * is checked against the event's season separately.
 */
export const plantingEventEditSchema = z.object({
  plantedOn: z.string().refine(isIsoDate, "Enter a real date.").nullable(),
  notes,
  lines: z.array(z.object({
    id: z.number().int().positive().nullable(),
    species: identifier.min(1, "Choose a species."),
    quantity: z.number({ error: "Enter how many were planted." })
      .int("Use a whole number.")
      .min(1, "Must be at least 1.")
      .max(100_000, "At most 100,000 per species."),
  })).min(1, "Keep at least one species.").max(200)
    .refine((lines) => new Set(lines.map((l) => l.species)).size === lines.length, "Each species can only be listed once."),
});

export type PlantingEventEdit = z.infer<typeof plantingEventEditSchema>;
export type PlantingEventEditResult = { error?: string; issues?: { path: string; message: string }[] };
