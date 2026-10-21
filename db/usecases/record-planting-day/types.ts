/**
 * What staff fill in to record a planting day. Change a field or a message
 * here; the check below and the save in index.ts follow this file.
 */
import { z } from "zod";
import { eventType } from "@/db/schema/enums";

export type EventType = (typeof eventType.enumValues)[number];

/** One species on the day. quantity null = not counted yet, never 0. */
export interface PlantingLine {
  speciesId: number;
  quantity: number | null;
}

export interface PlantingDayForm {
  siteAreaId: number;
  seasonId: number;
  /** ISO date, "2026-09-19". History has no date; a new day must. */
  plantingDate: string;
  eventType?: EventType | null;
  notes?: string;
  isPublic?: boolean;
  lines: PlantingLine[];
}

export const plantingLine = z.object({
  speciesId: z.number().int().positive(),
  quantity: z.number().int().min(0, "Can't be negative").nullable(),
}) satisfies z.ZodType<PlantingLine>;

export const plantingDayForm = z.object({
  siteAreaId: z.number().int().positive(),
  seasonId: z.number().int().positive(),
  plantingDate: z.iso.date("Pick the planting date"),
  eventType: z.enum(eventType.enumValues).nullish(),
  notes: z.string().optional(),
  isPublic: z.boolean().optional(),
  lines: z.array(plantingLine).min(1, "Add at least one species"),
}).refine((e) => new Set(e.lines.map((l) => l.speciesId)).size === e.lines.length, {
  message: "Add each species once",
  path: ["lines"],
}) satisfies z.ZodType<PlantingDayForm>;
