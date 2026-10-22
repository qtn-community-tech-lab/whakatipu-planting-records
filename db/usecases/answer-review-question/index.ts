/**
 * Answer a review question. WRT's ruling is written and every note filed under
 * that question is resolved in one call. A line leaves review only when no other
 * question on it is still open, so answering one never clears another.
 */
import type { Db } from "@/db/types";
import { reviewDecision } from "./types";

export * from "./types";

/** Returns how many lines left review, or null when there is no such question. Throws on a ruling the form would reject. */
export async function answerQuestion(db: Db, topic: string, input: unknown) {
  const decision = reviewDecision.parse(input);
  const { data } = await db
    .rpc("answer_review_question", { topic, decision })
    .throwOnError();
  return data;
}
