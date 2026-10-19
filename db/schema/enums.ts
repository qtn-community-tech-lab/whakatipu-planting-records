import { pgEnum } from "drizzle-orm/pg-core";

export const seasonName = pgEnum("season_name", ["Autumn", "Spring"]);
export const siteClass = pgEnum("site_class", ["keystone", "community", "school"]);
export const speciesStatus = pgEnum("species_status", ["core", "appended", "contested", "seedlog_only"]);
/** What kind of planting. Unknown (null) for every event from the workbook. */
export const eventType = pgEnum("event_type", ["establishment", "infill", "replacement"]);
/** Where an event came from: built from the legacy workbook, or recorded in the app. */
export const eventSource = pgEnum("event_source", ["workbook", "app"]);
/** ruling = WRT must decide; confirm = check once; fyi = for information only. */
export const noteKind = pgEnum("note_kind", ["ruling", "confirm", "fyi"]);
/** How a pin was placed. "surveyed" is for pins staff place on site. */
export const locationAccuracy = pgEnum("location_accuracy", ["historic-event", "landmark", "surveyed"]);
