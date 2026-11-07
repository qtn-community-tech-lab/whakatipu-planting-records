/**
 * Server-only entry point. Pages call `getWrt()`; nothing else in the UI
 * knows which repository is behind it. Every page reads Supabase through
 * SupabaseWrtRepository; the CSV one is kept only for the comparison test.
 */
import "server-only";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { SupabaseWrtRepository } from "@/db/repository";
import { createQueries, type WrtQueries } from "./queries";
import type { WrtRepository } from "./repository";
import { REVIEW_COOKIE, REVIEW_HIDDEN, confirmedOnly } from "./review-scope";

let repo: WrtRepository | null = null;
let queries: WrtQueries | null = null;
let allQueries: WrtQueries | null = null;

export function getRepository(): WrtRepository {
  if (!repo) repo = new SupabaseWrtRepository();
  return repo;
}

/** Is this reader seeing records still needing review? On unless they switched it off. */
export async function reviewShown(): Promise<boolean> {
  try {
    return (await cookies()).get(REVIEW_COOKIE)?.value !== REVIEW_HIDDEN;
  } catch (err) {
    unstable_rethrow(err);
    // No request to read (build-time params): the default view.
    return true;
  }
}

/** The repository for this request: everything, or confirmed records only, by the reader's switch. */
function scopedRepository(): WrtRepository {
  const all = getRepository();
  const confirmed = confirmedOnly(all);
  const pick = async () => ((await reviewShown()) ? all : confirmed);
  return {
    listSeasons: () => all.listSeasons(),
    listSpecies: () => all.listSpecies(),
    listPlaces: () => all.listPlaces(),
    listRecords: async () => (await pick()).listRecords(),
    listReconciliation: async () => (await pick()).listReconciliation(),
    listDataIssues: () => all.listDataIssues(),
    getSourceInfo: () => all.getSourceInfo(),
  };
}

/** What the reader has chosen to see. Every page uses this. */
export function getWrt(): WrtQueries {
  if (!queries) queries = createQueries(scopedRepository());
  return queries;
}

/** Every record whatever the switch says: for pages that explain the data itself. */
export function getWrtAll(): WrtQueries {
  if (!allQueries) allQueries = createQueries(getRepository());
  return allQueries;
}
