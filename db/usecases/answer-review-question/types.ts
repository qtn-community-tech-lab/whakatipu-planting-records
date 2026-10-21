/** WRT's ruling on an open question, in their words. */
import { z } from "zod";

export type ReviewDecision = {
  decision: string;
  /** ISO date the ruling was made. */
  decided_on: string;
  decided_by: string;
};

export const reviewDecision = z.object({
  decision: z.string().trim().min(1, "Write WRT's ruling"),
  decided_on: z.iso.date("Pick the date of the ruling"),
  decided_by: z.string().trim().min(1, "Who ruled?"),
}) satisfies z.ZodType<ReviewDecision>;
