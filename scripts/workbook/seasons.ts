import { z } from "zod";
import seasonDump from "../../data/seasons.json";
import type { TablesInsert } from "../../db/database.types";

const seasonSchema = z.object({
  id: z.number().int().nonnegative(),
  slug: z.string().min(1),
  label: z.string().min(1),
  year: z.number().int(),
  half: z.enum(["autumn", "spring"]),
  workbook_total: z.number().int().nonnegative().nullable(),
  workbook_cell: z.string().nullable(),
});

/** Validate every workbook season before any import writes. IDs preserve event references. */
export function readSeasonSeeds(records: { seasonSlug: string }[], dump: unknown = seasonDump) {
  const seasons = z.array(seasonSchema).parse(dump) satisfies TablesInsert<"seasons">[];
  for (const key of ["id", "slug"] as const) {
    if (new Set(seasons.map((season) => season[key])).size !== seasons.length) throw new Error(`Duplicate ${key} in data/seasons.json`);
  }
  const halves = new Set<string>();
  for (const season of seasons) {
    const slug = `${season.half}-${season.year}`;
    if (season.slug !== slug || halves.has(slug)) throw new Error(`Invalid or duplicate season ${season.slug} in data/seasons.json`);
    halves.add(slug);
  }
  for (const record of records) {
    if (!halves.has(record.seasonSlug)) throw new Error(`Workbook season ${record.seasonSlug} is missing from data/seasons.json`);
  }
  return seasons;
}
