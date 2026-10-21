/**
 * What staff may change on a species. Names and flags only: the slug and the
 * register's scientific spelling stay as the register has them.
 */
import { z } from "zod";

export interface SpeciesChanges {
  commonName?: string | null;
  /** Shown first in the app. */
  maoriName?: string | null;
  /** Usual botanical spelling, where it differs from the register's. */
  suggestedSpelling?: string | null;
  /** Trees That Count flag. Null = not stated. */
  over5m?: boolean | null;
  /** "T" in the Plants Out Master. */
  threatened?: boolean | null;
  /** "#" in the Te Kakano list. */
  threatenedTeKakano?: boolean;
  registerNote?: string | null;
}

const text = z.string().trim().nullish();

export const speciesChanges = z.object({
  commonName: text,
  maoriName: text,
  suggestedSpelling: text,
  over5m: z.boolean().nullish(),
  threatened: z.boolean().nullish(),
  threatenedTeKakano: z.boolean().optional(),
  registerNote: text,
}).strict() satisfies z.ZodType<SpeciesChanges>;
