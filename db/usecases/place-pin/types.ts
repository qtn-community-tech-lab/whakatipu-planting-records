/** Where a map pin sits and how far it reaches. The same limits the database keeps. */
import { z } from "zod";

export type PinChanges = {
  /** GeoJSON coordinates are longitude first, latitude second. */
  geometry?: { type: "Point"; coordinates: [number, number] };
  /** Metres, wide enough to cover private land. Null = a point. */
  radius_m?: number | null;
};

export const pinChanges = z.object({
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  }).strict().optional(),
  radius_m: z.number().int().positive("Radius must be more than 0 m").nullish(),
}).strict() satisfies z.ZodType<PinChanges>;
