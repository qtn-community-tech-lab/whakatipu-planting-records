/** The questions WRT still has to answer. Answering one: db/usecases/answer-review-question. */
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
