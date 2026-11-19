/** Server-only queries over Supabase, scoped by the reader’s review switch. */
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { SupabaseWrtRepository } from "@/db/repository";
import { createQueries, type WrtQueries } from "./queries";
import type { WrtRepository } from "./repository";
import { REVIEW_COOKIE, REVIEW_HIDDEN, confirmedOnly } from "./review-scope";

const requestRepository = cache(() => new SupabaseWrtRepository());

/** Layout and pages share the same history load within this request. */
export const getWrtForReview = cache((showReview: boolean): WrtQueries => {
  const repo = requestRepository();
  return createQueries(showReview ? repo : confirmedOnly(repo));
});

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
  const all = requestRepository();
  const confirmed = confirmedOnly(all);
  const pick = async () => ((await reviewShown()) ? all : confirmed);
  return {
    listSeasons: () => all.listSeasons(),
    listSpecies: () => all.listSpecies(),
    listPlaces: () => all.listPlaces(),
    listRecords: async () => (await pick()).listRecords(),
    listReconciliation: async () => (await pick()).listReconciliation(),
    getSourceInfo: () => all.getSourceInfo(),
  };
}

/** What the reader has chosen to see. Every page uses this. */
export const getWrt = cache((): WrtQueries => createQueries(scopedRepository()));

/** Every record whatever the switch says: for pages that explain the data itself. */
export const getWrtAll = cache((): WrtQueries => createQueries(requestRepository()));
