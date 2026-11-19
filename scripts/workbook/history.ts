/** Nested history seed: database IDs and audit identities are assigned on insert. */
import { z } from "zod";
import plantingDump from "../../data/plantings.json";

const nullableText = z.string().nullable();
const noteSchema = z.strictObject({
  question: z.string().min(1), kind: z.enum(["ruling", "confirm", "fyi"]),
  text: z.string(), resolved_at: nullableText, deactivated_at: nullableText,
});
const lineSchema = z.strictObject({
  species: z.string().min(1), quantity: z.number().int().nonnegative().nullable(),
  legacy_code: z.string().min(1), source_cell: nullableText, deactivated_at: nullableText,
  precision: nullableText, confidence: nullableText, source_file: nullableText, source_sheet: nullableText,
  season_original: nullableText, site_original: nullableText, species_original: nullableText,
  notes: z.array(noteSchema),
});
const plantingSchema = z.strictObject({
  area: z.string().min(1), season: z.string().min(1),
  planted_on: nullableText, type: z.enum(["establishment", "infill", "replacement"]).nullable(),
  source: z.literal("workbook"), notes: z.string(), deactivated_at: nullableText,
  lines: z.array(lineSchema),
});

export function readHistorySeeds(references: {
  areas: { slug: string }[]; seasons: { slug: string }[];
  species: { slug: string }[]; questions: { slug: string }[];
}, dump: unknown = plantingDump) {
  const plantings = z.array(plantingSchema).parse(dump);
  function requireReference(value: string, keys: Set<string>, context: string) {
    if (!keys.has(value)) throw new Error(`${context}: missing reference ${value}`);
  }
  const areas = new Set(references.areas.map((row) => row.slug));
  const seasons = new Set(references.seasons.map((row) => row.slug));
  const species = new Set(references.species.map((row) => row.slug));
  const questions = new Set(references.questions.map((row) => row.slug));
  const events = new Set<string>();
  const codes = new Set<string>();
  for (const planting of plantings) {
    const key = `${planting.area}|${planting.season}`;
    if (events.has(key)) throw new Error(`Duplicate planting ${key}`);
    events.add(key);
    requireReference(planting.area, areas, `Planting ${key} area`);
    requireReference(planting.season, seasons, `Planting ${key} season`);
    const activeSpecies = new Set<string>();
    for (const line of planting.lines) {
      if (codes.has(line.legacy_code)) throw new Error(`Duplicate legacy_code ${line.legacy_code}`);
      codes.add(line.legacy_code);
      requireReference(line.species, species, `Line ${line.legacy_code} species`);
      if (line.deactivated_at === null) {
        if (activeSpecies.has(line.species)) throw new Error(`Duplicate active species ${line.species} in ${key}`);
        activeSpecies.add(line.species);
      }
      const noteQuestions = new Set<string>();
      for (const note of line.notes) {
        requireReference(note.question, questions, `Line ${line.legacy_code} question`);
        if (noteQuestions.has(note.question)) throw new Error(`Duplicate note question ${note.question} on ${line.legacy_code}`);
        noteQuestions.add(note.question);
      }
    }
  }
  return plantings;
}
