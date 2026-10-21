/** The questions WRT still has to answer, and recording their answers. */
import type { SupabaseClient } from "@supabase/supabase-js";

/** Every question with lines still waiting on it, biggest first. A line can sit under two questions, so don't add the rows up. */
export async function openQuestions(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("totals_by_review_topic")
    .select("topic, label, question, decision, plants_needs_review, lines_needs_review")
    .gt("lines_needs_review", 0)
    .order("plants_needs_review", { ascending: false })
    .throwOnError();
  return data;
}

/** Write WRT's ruling on a question, in their words. */
export async function recordDecision(
  supabase: SupabaseClient,
  topic: string,
  ruling: { decision: string; decided_on: string; decided_by: string },
) {
  const { data } = await supabase
    .from("review_topics")
    .update(ruling)
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
