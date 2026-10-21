/** What staff may change on a species: names and flags. The slug and the register's spelling stay. */
import { z } from "zod";

export type SpeciesChanges = {
  common_name?: string | null;
  /** Shown first in the app. */
  maori_name?: string | null;
  /** Usual botanical spelling, where it differs from the register's. */
  suggested_spelling?: string | null;
  /** Trees That Count flag. Null = not stated. */
  over_5m?: boolean | null;
  /** "T" in the Plants Out Master. */
  threatened?: boolean | null;
  /** "#" in the Te Kakano list. */
  threatened_te_kakano?: boolean;
  register_note?: string | null;
};

const text = z.string().trim().nullish();

export const speciesChanges = z.object({
  common_name: text,
  maori_name: text,
  suggested_spelling: text,
  over_5m: z.boolean().nullish(),
  threatened: z.boolean().nullish(),
  threatened_te_kakano: z.boolean().optional(),
  register_note: text,
}).strict() satisfies z.ZodType<SpeciesChanges>;
