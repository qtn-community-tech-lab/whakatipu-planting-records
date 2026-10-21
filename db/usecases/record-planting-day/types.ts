/** What staff fill in to record a planting day. Change a field or a message here. */
import { z } from "zod";
/** What kind of planting. Unknown (null) for every event from the workbook. */
export type EventType = "establishment" | "infill" | "replacement";

/** One species on the day. quantity null = not counted yet, never 0. */
export type PlantingLine = {
  species_id: number;
  quantity: number | null;
};

export type PlantingDay = {
  site_area_id: number;
  season_id: number;
  /** ISO date, "2026-09-19". History has no date; a new day must. */
  planting_date: string;
  event_type?: EventType | null;
  notes?: string;
  is_public?: boolean;
  lines: PlantingLine[];
};

export const plantingLine = z.object({
  species_id: z.number().int().positive(),
  quantity: z.number().int().min(0, "Can't be negative").nullable(),
}) satisfies z.ZodType<PlantingLine>;

export const plantingDay = z.object({
  site_area_id: z.number().int().positive(),
  season_id: z.number().int().positive(),
  planting_date: z.iso.date("Pick the planting date"),
  event_type: z.enum(["establishment", "infill", "replacement"] satisfies EventType[]).nullish(),
  notes: z.string().optional(),
  is_public: z.boolean().optional(),
  lines: z.array(plantingLine).min(1, "Add at least one species"),
}).refine((d) => new Set(d.lines.map((l) => l.species_id)).size === d.lines.length, {
  message: "Add each species once",
  path: ["lines"],
}) satisfies z.ZodType<PlantingDay>;
