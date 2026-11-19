/** Complete species seed, exported from PostgreSQL without database-managed audit fields. */
import { z } from "zod";
import catalogue from "../../data/species.json";
import type { Database, Tables } from "../../db/database.types";
import { INPUT_LIMITS } from "../../lib/forms/limits";

const name = z.string().min(1).max(INPUT_LIMITS.shortText);
const identifier = z.string().min(1).max(INPUT_LIMITS.identifier);
const longText = z.string().max(INPUT_LIMITS.longText);
const url = z.url({ protocol: /^https$/i }).max(INPUT_LIMITS.url);

/** Every species column except created_at/by and updated_at/by belongs in the seed. */
export const speciesSeedSchema = z.array(z.strictObject({
  slug: identifier.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  register_code: identifier.nullable(),
  scientific_name: name,
  suggested_spelling: name.nullable(),
  common_name: name.nullable(),
  maori_name: name.nullable(),
  status: z.enum(["core", "appended", "contested", "seedlog_only"]).nullable(),
  over_5m: z.boolean().nullable(),
  threatened: z.boolean().nullable(),
  threatened_te_kakano: z.boolean(),
  needs_decision: z.boolean(),
  contested_group: identifier.regex(/^C\d+$/).nullable(),
  register_note: longText.nullable(),
  maori_name_alternatives: z.array(name),
  summary: longText.nullable(),
  look_for: longText.nullable(),
  sources: z.array(z.strictObject({ label: name, url })),
  checked_at: z.iso.date().nullable(),
  photos: z.array(z.strictObject({
    src: url,
    attribution: z.string().max(INPUT_LIMITS.shortText),
    sourceUrl: url.optional(),
    licenseUrl: url.optional(),
  })),
  deactivated_at: z.iso.datetime({ offset: true }).nullable(),
})).min(1).superRefine((entries, ctx) => {
  const codes = new Set<string>();
  const slugs = new Set<string>();
  for (const [index, entry] of entries.entries()) {
    const alternatives = entry.maori_name_alternatives;
    if (new Set(alternatives).size !== alternatives.length || (entry.maori_name !== null && alternatives.includes(entry.maori_name))) {
      ctx.addIssue({ code: "custom", path: [index, "maori_name_alternatives"], message: "List each alternative once and leave out the preferred Māori name." });
    }
    for (const [field, seen, key] of [
      ["register_code", codes, entry.register_code], ["slug", slugs, entry.slug],
    ] as const) {
      if (key === null) continue;
      if (seen.has(key)) ctx.addIssue({ code: "custom", path: [index, field], message: `Duplicate ${field}: ${key}` });
      seen.add(key);
    }
  }
});

export type SpeciesSeedEntry = z.infer<typeof speciesSeedSchema>[number];

export function readSpeciesSeed(): SpeciesSeedEntry[] {
  return speciesSeedSchema.parse(catalogue) satisfies Omit<Tables<"species">,
    "created_at" | "created_by" | "updated_at" | "updated_by"
  >[];
}

const referenceColumns = ["maori_name_alternatives", "summary", "look_for", "sources", "checked_at"] as const;
type ExistingReferences = Partial<Pick<Tables<"species">, typeof referenceColumns[number] | "common_name" | "maori_name" | "photos">>;

/** Preserve filled editorial fields. The slug is a lookup key and never an update value. */
export function speciesBackfillValues(
  entry: SpeciesSeedEntry,
  current: ExistingReferences = {},
) {
  const values: Database["public"]["Tables"]["species"]["Update"] = {
    scientific_name: entry.scientific_name,
    suggested_spelling: entry.suggested_spelling,
    threatened: entry.threatened,
  };
  if (!current.common_name?.trim() && entry.common_name) values.common_name = entry.common_name;
  if (!current.maori_name?.trim() && entry.maori_name) values.maori_name = entry.maori_name;
  // Preserve existing reference content and Māori alternatives as a unit.
  const hasProfile = referenceColumns.some((key) => {
    const value = current[key];
    return Array.isArray(value) ? value.length > 0 : typeof value === "string" && value.trim().length > 0;
  });
  if (!hasProfile && entry.summary) {
    values.maori_name_alternatives = entry.maori_name_alternatives;
    values.summary = entry.summary;
    values.look_for = entry.look_for;
    values.sources = entry.sources;
    values.checked_at = entry.checked_at;
  }
  if ((!current.photos || (Array.isArray(current.photos) && current.photos.length === 0))
    && Array.isArray(entry.photos) && entry.photos.length > 0) {
    values.photos = entry.photos;
  }
  return values;
}
