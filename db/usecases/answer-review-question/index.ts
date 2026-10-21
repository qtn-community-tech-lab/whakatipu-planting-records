/** Record WRT's answer to a review question, then resolve the lines it covers one at a time. */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReviewDecision } from "./types";

export { reviewDecision, type ReviewDecision } from "./types";

/** Returns the saved question, or null when it is missing or not the caller's to change. */
export async function recordDecision(supabase: SupabaseClient, topic: string, d: ReviewDecision) {
  const { data } = await supabase
    .from("review_topics")
    .update({ decision: d.decision, decided_on: d.decidedOn, decided_by: d.decidedBy })
    .eq("slug", topic)
    .select()
    .maybeSingle()
    .throwOnError();
  return data;
}

/** After a ruling, mark one line resolved. */
export async function resolveLine(supabase: SupabaseClient, lineId: number) {
  await supabase.from("planting_lines").update({ needs_review: false }).eq("id", lineId).throwOnError();
}
