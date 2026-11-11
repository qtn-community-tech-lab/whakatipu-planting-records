import { redirect } from "next/navigation";
import { isAuthenticated } from "@/db/queries/auth";
import AskChat from "@/components/wrt/ask/chat";

export default async function AskPage() {
  if (!(await isAuthenticated())) redirect("/login?next=%2Fask");
  return <AskChat />;
}
