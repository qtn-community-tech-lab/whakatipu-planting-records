/**
 * THE NEW MODEL'S CORE.
 *
 *   A planting event is one site area in one season (and, for new events, one day).
 *   Its lines say how many of each species went in.
 *
 * History and new data share these tables:
 *   - source "workbook": built from the legacy layer. One event per area per season,
 *     no date, no type. Each line keeps legacy_code, pointing at its legacy row.
 *   - source "app": recorded by staff. Must have a date. Lines have no legacy_code.
 * "Recorded", not "planted": the workbook was filled from allocation sheets.
 */
import { sql } from "drizzle-orm";
import {
  boolean, check, date, integer, pgTable, smallint, text, unique, uniqueIndex,
} from "drizzle-orm/pg-core";
import { editTrail, publicRead, staffAccess } from "./access";
import { eventSource, eventType, noteKind, seasonName } from "./enums";
import { plantingHistory } from "./legacy";
import { siteAreas } from "./places";
import { species } from "./species";

/** Autumn or Spring of a year. WRT plans and reports by season. */
export const seasons = pgTable("seasons", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: text().notNull().unique(),                       // "autumn-2024"
  year: smallint().notNull(),
  name: seasonName().notNull(),
  label: text().notNull(),                               // "Autumn 2024"
  sortOrder: smallint().notNull(),                       // 0 = Autumn 2015
  workbookTotal: integer(),                              // the season's TOTAL cell in MASTER, for checking
  workbookCell: text(),                                  // "MASTER!T107"
}, (t) => [
  unique().on(t.year, t.name),
  check("season_slug_format", sql`${t.slug} ~ '^(autumn|spring)-[0-9]{4}$'`),
  ...staffAccess(),
  publicRead(sql`true`),
]);

/** The questions WRT needs to answer once, and the answer when it comes. */
export const reviewTopics = pgTable("review_topics", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: text().notNull().unique(),                       // "slope-hill-2024"
  label: text().notNull(),
  question: text().notNull(),
  decision: text(),                                      // WRT's ruling, in their words
  decidedOn: date(),
  decidedBy: text(),
  ...editTrail(),
}, () => [...staffAccess()]);

export const plantingEvents = pgTable("planting_events", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  siteAreaId: integer().notNull().references(() => siteAreas.id),
  seasonId: integer().notNull().references(() => seasons.id),
  plantingDate: date(),                                  // required for new events, unknown for history
  eventType: eventType(),                                // unknown (null) for history
  notes: text().notNull().default(""),
  isPublic: boolean().notNull().default(false),
  source: eventSource().notNull().default("app"),
  ...editTrail(),
}, (t) => [
  check("new_events_have_a_date", sql`${t.source} = 'workbook' or ${t.plantingDate} is not null`),
  // History has exactly one event per area per season.
  uniqueIndex("one_workbook_event_per_area_season").on(t.siteAreaId, t.seasonId).where(sql`${t.source} = 'workbook'`),
  ...staffAccess(),
  publicRead(sql`${t.isPublic} and ${t.deactivatedAt} is null`),
]);

export const plantingLines = pgTable("planting_lines", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  eventId: integer().notNull().references(() => plantingEvents.id, { onDelete: "cascade" }),
  speciesId: integer().notNull().references(() => species.id),
  quantity: integer(),                                   // null = unknown ("TBC"), never 0
  needsReview: boolean().notNull().default(false),       // WRT still has to rule or confirm
  legacyCode: text().unique().references(() => plantingHistory.recordId), // history only
  ...editTrail(),
}, (t) => [
  check("quantity_not_negative", sql`${t.quantity} >= 0`),
  uniqueIndex("one_line_per_species").on(t.eventId, t.speciesId).where(sql`${t.deactivatedAt} is null`),
  ...staffAccess(),
  publicRead(sql`${t.deactivatedAt} is null and exists (
    select 1 from public.planting_events e where e.id = ${t.eventId} and e.is_public and e.deactivated_at is null)`),
]);

/** Why a line needs review, or how it was read. Each note sits under a review topic. */
export const lineNotes = pgTable("line_notes", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  lineId: integer().notNull().references(() => plantingLines.id, { onDelete: "cascade" }),
  topicId: integer().notNull().references(() => reviewTopics.id),
  kind: noteKind().notNull(),
  text: text().notNull(),
  ...editTrail(),
}, () => [...staffAccess()]);
