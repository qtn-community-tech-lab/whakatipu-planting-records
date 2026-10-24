/** Server-only entry point. Reads as the current Supabase caller, without caching. */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { readExplorer } from "@/db/queries/explorer";
import { createQueries } from "./queries";

export function getWrt() {
  return createQueries(async () => readExplorer(await createClient()));
}
