/** The questions WRT still has to answer. */
import type { Db } from "@/db/types";
import { reviewTotals } from "./views";

/** Every question with lines still waiting on it, biggest first. */
export async function openQuestions(db: Db) {
  const { data } = await reviewTotals(db)
    .gt("lines_needs_review", 0)
    .throwOnError();
  return data;
}
