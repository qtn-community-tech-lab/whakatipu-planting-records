/** Where a map pin sits and how far it reaches. The same limits the database keeps. */
import { z } from "zod";

export type PinChanges = {
  latitude?: number;
  longitude?: number;
  /** Metres, wide enough to cover private land. Null = a point. */
  radius_m?: number | null;
};

export const pinChanges = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius_m: z.number().int().positive("Radius must be more than 0 m").nullish(),
}).strict() satisfies z.ZodType<PinChanges>;
