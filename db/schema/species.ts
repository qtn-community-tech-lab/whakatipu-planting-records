/**
 * What gets planted: WRT's species register, with profiles and reference photos.
 * The species list is public: there is nothing on it to hide.
 */
import { sql } from "drizzle-orm";
import { boolean, date, integer, jsonb, pgTable, primaryKey, smallint, text } from "drizzle-orm/pg-core";
import { editTrail, publicRead, staffAccess } from "./access";
import { speciesStatus } from "./enums";

export const species = pgTable("species", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: text().notNull().unique(),                       // "sophora-microphylla"
  scientificName: text().notNull(),                      // the register's spelling
  suggestedSpelling: text(),                             // usual botanical spelling, where it differs
  commonName: text(),
  maoriName: text(),                                     // shown first in the app
  status: speciesStatus(),
  over5m: boolean("over_5m"),                                     // Trees That Count flag; null = not stated
  threatened: boolean(),                                 // "T" in the Plants Out Master
  threatenedTeKakano: boolean().notNull().default(false),// "#" in the Te Kakano list; the two disagree
  contestedGroup: text(),                                // "C1"–"C9": not yet ruled one species or two
  needsDecision: boolean().notNull().default(false),
  registerNote: text(),
  registerCode: text(),                                  // legacy SP- code: audit only, renumbered on regeneration
  ...editTrail(),
}, (t) => [
  ...staffAccess(),
  publicRead(sql`${t.deactivatedAt} is null`),
]);

/** A write-up of each species for staff and volunteers. One per species. */
export const speciesProfiles = pgTable("species_profiles", {
  speciesId: integer().primaryKey().references(() => species.id),
  commonName: text(),
  maoriNames: text().array().notNull().default(sql`'{}'`),
  nameNote: text(),
  summary: text(),
  lookFor: text(),
  sources: jsonb().$type<{ label: string; url: string }[]>().notNull().default([]),
  checkedOn: date(),
  photosStatus: text(),                                  // "confirmed" once checked by eye
  photosNote: text(),
  photosSummary: text(),
  photosCheckedOn: date(),
  ...editTrail(),
}, (t) => [
  ...staffAccess(),
  publicRead(sql`${t.deactivatedAt} is null`),
]);

/** Reference photos of a species from elsewhere, with the credit their licence requires. */
export const speciesPhotos = pgTable("species_photos", {
  speciesId: integer().notNull().references(() => species.id),
  position: smallint().notNull(),
  src: text().notNull(),
  width: integer(),
  height: integer(),
  caption: text(),
  author: text(),
  license: text(),
  licenseUrl: text(),
  sourceName: text(),
  sourceUrl: text(),
  articleUrl: text(),
  articleLabel: text(),
  observationUrl: text(),                                // iNaturalist photos only
  focalPoint: text(),
  retrievedOn: date(),
  ...editTrail(),
}, (t) => [
  primaryKey({ columns: [t.speciesId, t.position] }),
  ...staffAccess(),
  publicRead(sql`${t.deactivatedAt} is null`),
]);
