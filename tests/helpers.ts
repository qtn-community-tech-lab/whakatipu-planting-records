import { CsvWrtRepository } from "@/lib/wrt/csv/csv-repository";
import { createQueries } from "@/lib/wrt/queries";
import type { QuantitySplit } from "@/lib/wrt/types";

/** One repository + query layer over the real CSVs, shared by every test file. */
export const repo = new CsvWrtRepository();
export const q = createQueries(repo);

/** A split must always add up. */
export function expectCoherentSplit(s: QuantitySplit, where = "split") {
  if (s.total !== s.resolved + s.needsReview) {
    throw new Error(`${where}: total ${s.total} !== resolved ${s.resolved} + needsReview ${s.needsReview}`);
  }
  if (s.records < s.recordsNeedingReview) {
    throw new Error(`${where}: records ${s.records} < recordsNeedingReview ${s.recordsNeedingReview}`);
  }
  for (const k of Object.keys(s) as (keyof QuantitySplit)[]) {
    if (!Number.isFinite(s[k]) || s[k] < 0) throw new Error(`${where}: ${k} is ${s[k]}`);
  }
}
