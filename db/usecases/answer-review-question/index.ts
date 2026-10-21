/** Record WRT's answer to a review question, then resolve the lines it covers one at a time. */
import type { Db } from "@/db/types";
import type { ReviewDecision } from "./types";

export * from "./types";

/** Returns the saved question, or null when it is missing or not the caller's to change. */
export async function recordDecision(db: Db, topic: string, decision: ReviewDecision) {
  const { data } = await db
    .from("review_topics")
    .update(decision)
    .eq("slug", topic)
    .select()
    .maybeSingle()
    .throwOnError();
  return data;
}

/** After a ruling, mark one line resolved. */
export async function resolveLine(db: Db, lineId: number) {
  await db
    .from("planting_lines")
    .update({ needs_review: false })
    .eq("id", lineId)
    .throwOnError();
}
