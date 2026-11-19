/** Complete species seed, exported from PostgreSQL without database-managed audit fields. */
import { z } from "zod";
import catalogue from "../../data/species.json";
import type { Tables } from "../../db/database.types";
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
