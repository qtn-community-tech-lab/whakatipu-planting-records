import { requireAuthenticated } from "@/db/queries/auth";
import AskChat from "@/components/wrt/ask/chat";

export default async function AskPage() {
  await requireAuthenticated("/ask");
  return <AskChat />;
}
