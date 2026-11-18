/** The maintained register. CSVs are needed only to audit its original extraction. */
import { z } from "zod";
import catalogue from "../../data/species.json";
import profiles from "../../data/species-profiles.json";
import photos from "../../data/species-photos.json";
import type { Database, Json } from "../../db/database.types";
import { INPUT_LIMITS } from "../../lib/forms/limits";

const name = z.string().min(1).max(INPUT_LIMITS.shortText);
const identifier = z.string().min(1).max(INPUT_LIMITS.identifier);

/** Only existing species columns belong in the seed. No assessment is stored. */
export const speciesSeedSchema = z.array(z.strictObject({
  slug: identifier.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  register_code: identifier.regex(/^SP-\d{3}$/),
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
  register_note: z.string().max(INPUT_LIMITS.longText).nullable(),
})).min(1).superRefine((entries, ctx) => {
  const codes = new Set<string>();
  const slugs = new Set<string>();
  for (const [index, entry] of entries.entries()) {
    for (const [field, seen, key] of [
      ["register_code", codes, entry.register_code], ["slug", slugs, entry.slug],
    ] as const) {
      if (seen.has(key)) ctx.addIssue({ code: "custom", path: [index, field], message: `Duplicate ${field}: ${key}` });
      seen.add(key);
    }
  }
});

export type SpeciesSeedEntry = z.infer<typeof speciesSeedSchema>[number];

export function readSpeciesSeed(): SpeciesSeedEntry[] {
  return speciesSeedSchema.parse(catalogue);
}

/** References stay in their existing files and join by the original register code. */
export function speciesSeedRows() {
  const profileById = new Map(profiles.map((profile) => [profile.speciesId, profile]));
  const photoById = Map.groupBy(photos, (photo) => photo.speciesId);
  return readSpeciesSeed().map((entry) => ({
    ...entry,
    profile: (profileById.get(entry.register_code) ?? {}) as NonNullable<Json>,
    photos: (photoById.get(entry.register_code) ?? []).map((photo) => ({
      src: photo.src, attribution: `${photo.author} · ${photo.license}`,
      sourceUrl: photo.sourceUrl, licenseUrl: photo.licenseUrl,
    })),
  })) satisfies Database["public"]["Tables"]["species"]["Insert"][];
}

type ExistingReferences = {
  common_name?: string | null;
  maori_name?: string | null;
  profile?: Json;
  photos?: Json;
};

/** Preserve filled editorial fields. The slug is a lookup key and never an update value. */
export function speciesBackfillValues(
  entry: SpeciesSeedEntry & { profile?: NonNullable<Json>; photos?: Json },
  current: ExistingReferences = {},
) {
  const values: Database["public"]["Tables"]["species"]["Update"] = {
    scientific_name: entry.scientific_name,
    suggested_spelling: entry.suggested_spelling,
    threatened: entry.threatened,
  };
  if (!current.common_name?.trim() && entry.common_name) values.common_name = entry.common_name;
  if (!current.maori_name?.trim() && entry.maori_name) values.maori_name = entry.maori_name;
  if ((!current.profile || (typeof current.profile === "object" && Object.keys(current.profile).length === 0))
    && entry.profile && typeof entry.profile === "object" && Object.keys(entry.profile).length > 0) {
    values.profile = entry.profile;
  }
  if ((!current.photos || (Array.isArray(current.photos) && current.photos.length === 0))
    && Array.isArray(entry.photos) && entry.photos.length > 0) {
    values.photos = entry.photos;
  }
  return values;
}
