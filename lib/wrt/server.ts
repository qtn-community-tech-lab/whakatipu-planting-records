/**
 * Server-only entry point. Pages call `getWrt()`; nothing else in the UI
 * knows which repository is behind it. Swap CsvWrtRepository for a database
 * repository here and nothing above changes.
 */
import "server-only";
import { CsvWrtRepository, DEFAULT_DATA_DIR } from "./csv/csv-repository";
import { createQueries, type WrtQueries } from "./queries";
import type { WrtRepository } from "./repository";

let repo: WrtRepository | null = null;
let queries: WrtQueries | null = null;

export function getRepository(): WrtRepository {
  if (!repo) repo = new CsvWrtRepository(process.env.WRT_DATA_DIR || DEFAULT_DATA_DIR);
  return repo;
}

export function getWrt(): WrtQueries {
  if (!queries) queries = createQueries(getRepository());
  return queries;
}
