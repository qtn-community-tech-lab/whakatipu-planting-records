/**
 * Zod schemas, generated from the Drizzle tables so they never drift from the
 * database, then tightened where a form needs more than the column type says.
 *
 * Layers: zod checks the form (clear messages before anything is sent) →
 * access rules decide who may write → Postgres constraints guard the data,
 * including writes that never pass through a form (imports, scripts).
 */
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";
import * as t from "./schema";

const slugRule = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slug = (s: z.ZodString) => s.regex(slugRule, "Use lower-case words joined by hyphens");
const name = (s: z.ZodString) => s.trim().min(1, "Required");

/** Columns the database fills in. Never part of a form. */
const trail = { createdAt: true, createdBy: true, updatedAt: true, updatedBy: true } as const;

// ------------------------------------------------------------------ enums
export const siteClassSchema = createSelectSchema(t.siteClass);
export const eventTypeSchema = createSelectSchema(t.eventType);
export const locationAccuracySchema = createSelectSchema(t.locationAccuracy);

// ------------------------------------------------------------------ places
export const siteInsert = createInsertSchema(t.sites, { slug, name }).omit(trail);
export const siteUpdate = createUpdateSchema(t.sites, { slug, name }).omit(trail);
export const siteAreaInsert = createInsertSchema(t.siteAreas, { slug, name }).omit(trail);
export const siteLocationInsert = createInsertSchema(t.siteLocations, {
  slug,
  latitude: (s) => s.min(-90).max(90),
  longitude: (s) => s.min(-180).max(180),
  radiusM: (s) => s.int().positive("Radius must be more than 0 m"),
}).omit(trail);

// ------------------------------------------------------------------ species
export const speciesInsert = createInsertSchema(t.species, {
  slug,
  scientificName: name,
  contestedGroup: (s) => s.regex(/^C\d+$/, 'Use WRT\'s group code, e.g. "C3"'),
}).omit(trail);
export const speciesProfileInsert = createInsertSchema(t.speciesProfiles, {
  sources: z.array(z.object({ label: z.string().min(1), url: z.url() })),
}).omit(trail);
export const speciesPhotoInsert = createInsertSchema(t.speciesPhotos, {
  src: z.url(),
}).omit(trail);

// ------------------------------------------------------------------ plantings
export const reviewDecision = createUpdateSchema(t.reviewTopics, {
  decision: (s) => s.trim().min(1, "Write WRT's ruling"),
}).pick({ decision: true, decidedOn: true, decidedBy: true });

export const plantingLineInsert = createInsertSchema(t.plantingLines, {
  quantity: (s) => s.int().min(0, "Can't be negative"),
}).omit(trail);

/**
 * The form staff fill in to record a planting day: one event and its species
 * lines, saved together. Unlike history, a new event needs a date.
 */
export const plantingDayForm = createInsertSchema(t.plantingEvents)
  .pick({ siteAreaId: true, seasonId: true, eventType: true, notes: true, isPublic: true })
  .extend({
    plantingDate: z.iso.date("Pick the planting date"),
    lines: z.array(z.object({
      speciesId: z.number().int().positive(),
      quantity: z.number().int().min(0, "Can't be negative").nullable(), // null = not counted yet
    })).min(1, "Add at least one species"),
  })
  .refine((e) => new Set(e.lines.map((l) => l.speciesId)).size === e.lines.length, {
    message: "Add each species once",
    path: ["lines"],
  });

export type PlantingDayForm = z.infer<typeof plantingDayForm>;
export type SiteLocationInsert = z.infer<typeof siteLocationInsert>;
