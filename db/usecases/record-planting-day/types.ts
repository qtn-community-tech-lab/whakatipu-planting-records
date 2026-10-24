/** What staff fill in to record a planting day. Change a field or a message here. */
import { z } from "zod";
import { plantingEventTypes } from "@/db/enums";
import { domainId, type DomainId } from "@/db/ids";
import type { Database } from "@/db/types";

/** One species on the day. quantity null = not counted yet, never 0. */
export type PlantingLine = {
  species_id: DomainId;
  quantity: number | null;
};

export type PlantingDay = {
  site_id: DomainId;
  planting_area_id?: DomainId | null;
  /** Free text, for example "summer" or "winter". */
  season: string;
  /** ISO date, "2026-09-19". History has no date; a new day must. */
  planting_date: string;
  /** Unknown for history; valid values come from the database enum. */
  event_type?: Database["public"]["Enums"]["planting_event_type"] | null;
  notes?: string;
  is_public?: boolean;
  lines: PlantingLine[];
};

export const plantingLine = z.object({
  species_id: domainId,
  quantity: z.number().int().min(0, "Can't be negative").nullable(),
}) satisfies z.ZodType<PlantingLine>;

export const plantingDay = z.object({
  site_id: domainId,
  planting_area_id: domainId.nullish(),
  season: z.string().trim().min(1, "Enter a season"),
  planting_date: z.iso.date("Pick the planting date"),
  event_type: z.enum(plantingEventTypes).nullish(),
  notes: z.string().optional(),
  is_public: z.boolean().optional(),
  lines: z.array(plantingLine).min(1, "Add at least one species"),
}).refine((d) => new Set(d.lines.map((l) => l.species_id)).size === d.lines.length, {
  message: "Add each species once",
  path: ["lines"],
}) satisfies z.ZodType<PlantingDay>;
