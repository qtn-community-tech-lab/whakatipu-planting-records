/**
 * THE OLD LAYER: the five generated CSVs from the Plants Out Master workbook,
 * loaded as they are, one table per file, columns in the files' own order.
 *
 * Written only by scripts/import-history.ts, refreshed on each import, never edited.
 * The new model (public schema) is built from these same files, and every history
 * line in public.planting_lines points back to its row here (legacy_code → record_id).
 * Values stay as the generator wrote them: "Y"/"N" flags, SP- codes, raw spellings.
 */
import { integer, jsonb, pgSchema, text, timestamp } from "drizzle-orm/pg-core";
import { staffReadOnly } from "./access";

export const legacy = pgSchema("legacy");

/** One row per import. Its id is the data version: a hash of the five CSVs. */
export const imports = legacy.table("imports", {
  id: text().primaryKey(),
  importedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  files: jsonb().$type<{ name: string; sha256: string; rows: number }[]>().notNull(),
  workbookSha256: text(),
}, () => staffReadOnly());

/** planting_history.csv: one row per non-empty MASTER cell (species × site column × season). */
export const plantingHistory = legacy.table("planting_history", {
  recordId: text().primaryKey(),                  // "PH-2019A-FK96"
  year: integer().notNull(),
  season: text().notNull(),                       // "Autumn" | "Spring"
  seasonLabelOriginal: text(),
  siteOriginal: text(),                           // header as typed; "[name]" masks kept
  siteIdProposed: text(),
  siteGroupProposed: text(),
  siteClass: text(),                              // "K" | "C" | "S" | "unknown"
  speciesOriginal: text(),
  speciesIdProposed: text(),                      // "SP-152": changes when regenerated
  speciesCanonical: text(),
  quantity: integer(),                            // null where the cell was not a number
  precision: text(),
  confidence: text(),
  needsReview: text(),                            // "Y" | "N"
  reviewReason: text(),
  sourceFile: text(),
  sourceSheet: text(),
  sourceCell: text(),
  importId: text().notNull().references(() => imports.id),
}, () => staffReadOnly());

/** species_master_proposed.csv: WRT's species register as extracted. */
export const speciesRegister = legacy.table("species_register", {
  speciesId: text().primaryKey(),                 // "SP-152"
  canonicalHandle: text().notNull(),
  suggestedSpelling: text(),
  commonName: text(),
  maoriName: text(),
  status: text(),
  inCore98: text("in_core_98"),
  over5m: text("over_5m"),
  threatened: text(),
  needsWrtDecision: text(),
  contestedWith: text(),                          // space-separated SP- codes
  aliasRows: integer(),
  occurrences: integer(),
  sourceTypes: text(),
  note: text(),
  importId: text().notNull().references(() => imports.id),
}, () => staffReadOnly());

/** species_crosswalk.csv: every spelling of a plant name found in WRT's files. */
export const speciesCrosswalk = legacy.table("species_crosswalk", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  speciesId: text(),                              // blank for spellings that match nothing yet
  rawName: text().notNull(),
  proposedCanonicalName: text(),
  aliasType: text(),
  confidence: text(),
  needsWrtDecision: text(),
  occurrences: integer(),
  sources: text(),
  note: text(),
  matchKey: text(),
  importId: text().notNull().references(() => imports.id),
}, () => staffReadOnly());

/** site_crosswalk.csv: every MASTER site header and how it was mapped. */
export const siteCrosswalk = legacy.table("site_crosswalk", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  siteOriginal: text().notNull(),
  siteIdAsTyped: text(),
  siteIdProposed: text(),
  siteNameProposed: text(),
  siteGroup: text(),
  class: text(),
  precision: text(),
  confidence: text(),
  needsReview: text(),
  mappingRule: text(),
  columns: integer(),
  records: integer(),
  plants: integer(),
  seasonsWithRecords: text(),
  note: text(),
  importId: text().notNull().references(() => imports.id),
}, () => staffReadOnly());

/** history_reconciliation.csv: generated totals against the workbook's own TOTAL cells. */
export const reconciliation = legacy.table("reconciliation", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  item: text().notNull(),                         // "season" | "grand" | "exception"
  label: text().notNull(),
  generated: integer(),
  stated: integer(),
  difference: integer(),
  statedCell: text(),
  records: integer(),
  cause: text(),
  importId: text().notNull().references(() => imports.id),
}, () => staffReadOnly());

export const legacyTables = { imports, plantingHistory, speciesRegister, speciesCrosswalk, siteCrosswalk, reconciliation };
