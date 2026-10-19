/**
 * Zod schemas for the hand- and agent-edited content files in data/*.json.
 * They describe the files as written (camelCase, the files' own field names).
 * The import validates every file before writing anything; tests do the same.
 */
import { z } from "zod";

const isoDate = z.iso.date();
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const registerCode = z.string().regex(/^SP-\d{3}$/);

/** data/site-locations.json: map pins. parcelIds = the one area a pin covers, if any. */
export const siteLocationFile = z.array(z.object({
  id: slug,
  siteSlug: slug,
  label: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  precision: z.enum(["historic-event", "landmark", "surveyed"]),
  description: z.string(),
  sourceUrl: z.url(),
  sourceLabel: z.string().min(1),
  coordinateSourceUrl: z.url(),
  coordinateMethod: z.string(),
  checkedOn: isoDate,
  parcelIds: z.array(z.string().min(1)).max(1, "A pin covers the whole site or one area").optional(),
}).strict()).refine((pins) => new Set(pins.map((p) => p.id)).size === pins.length, "Pin ids must be unique");

/** data/species-profiles.json */
export const speciesProfileFile = z.array(z.object({
  speciesId: registerCode,
  scientificName: z.string().min(1),
  commonName: z.string().min(1).nullable(),
  maoriNames: z.array(z.string().min(1)),
  nameNote: z.string().optional(),
  summary: z.string().min(1),
  lookFor: z.string().min(1),
  sources: z.array(z.object({ label: z.string().min(1), url: z.url() }).strict()).min(1),
  checkedAt: isoDate,
}).strict());

/** data/species-photos.json: reference photos. A CC BY licence requires the author's credit. */
export const speciesPhotoFile = z.array(z.object({
  speciesId: registerCode,
  scientificName: z.string().min(1),
  src: z.url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  caption: z.string(),
  author: z.string(),
  license: z.string().min(1),
  licenseUrl: z.url(),
  sourceUrl: z.url(),
  sourceName: z.enum(["Wikimedia Commons", "iNaturalist"]),
  articleUrl: z.url(),
  articleLabel: z.string().optional(),
  observationUrl: z.url().optional(),
  retrievedAt: isoDate,
  focalPoint: z.string().regex(/^\d{1,3}% \d{1,3}%$/),
}).strict().refine((p) => !p.license.startsWith("CC BY") || p.author.trim().length > 0, {
  message: "CC BY photos must credit the author",
  path: ["author"],
}));

/** data/species-reference-reviews.json: whether each species' photos were checked by eye. */
export const photoCheckFile = z.array(z.object({
  speciesId: registerCode,
  scientificName: z.string().min(1),
  status: z.enum(["confirmed", "partial", "unresolved"]),
  reason: z.string().min(1),
  photoCount: z.number().int().min(0),
  checkedAt: isoDate,
  summary: z.string().optional(),
}).strict());

export const contentFiles = {
  "site-locations.json": siteLocationFile,
  "species-profiles.json": speciesProfileFile,
  "species-photos.json": speciesPhotoFile,
  "species-reference-reviews.json": photoCheckFile,
} as const;
