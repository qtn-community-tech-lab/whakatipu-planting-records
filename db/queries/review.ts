/** The questions WRT still has to answer. */
import { db } from "@/db/client";
import { questions } from "./views";

/** Every question with lines still waiting on it, and how many open notes it has. */
export async function listOpenQuestions() {
  const { data } = await questions(await db())
    .throwOnError();
  return data
    .map(({ notes, ...question }) => ({ ...question, openNotes: notes[0]?.count ?? 0 }))
    .filter((question) => question.openNotes > 0);
}
