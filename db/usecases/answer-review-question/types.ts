/** WRT's ruling on an open question, in their words. */
import { z } from "zod";

export interface ReviewDecision {
  decision: string;
  /** ISO date the ruling was made. */
  decidedOn: string;
  decidedBy: string;
}

export const reviewDecision = z.object({
  decision: z.string().trim().min(1, "Write WRT's ruling"),
  decidedOn: z.iso.date("Pick the date of the ruling"),
  decidedBy: z.string().trim().min(1, "Who ruled?"),
}) satisfies z.ZodType<ReviewDecision>;
