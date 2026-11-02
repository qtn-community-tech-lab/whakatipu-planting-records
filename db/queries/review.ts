/** The questions WRT still has to answer. */
import { db } from "@/db/client";
import { questions, questionTotals } from "./views";

/** Plants and lines still waiting on one question, or null when none are. */
export async function getQuestionTotals(slug: string) {
  const { data } = await questionTotals(await db())
    .eq("question", slug)
    .maybeSingle()
    .throwOnError();
  return data;
}

/** Every question with lines still waiting on it, and how many open notes it has. */
export async function listOpenQuestions() {
  const { data } = await questions(await db())
    .throwOnError();
  return data
    .map(({ notes, ...question }) => ({ ...question, openNotes: notes[0]?.count ?? 0 }))
    .filter((question) => question.openNotes > 0);
}
