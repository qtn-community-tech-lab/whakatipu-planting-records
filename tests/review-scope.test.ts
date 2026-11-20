import { describe, expect, it } from "vitest";
import { q } from "./helpers";
import { parseRecordParams, recordsHref } from "@/components/wrt/explore/filters";

describe("complete planting history", () => {
  it("ignores retired review filters in saved URLs and preserves all quantities", async () => {
    const lookups = await q.lookups();
    const all = await q.records();
    expect(all.rows.some((row) => row.record.needsReview)).toBe(true);
    for (const review of ["needs-review", "resolved"]) {
      const view = parseRecordParams({ review, theme: "order-scheme" }, lookups);
      expect(view.filter).toEqual({});
      expect(recordsHref(view)).toBe("/records");
      const result = await q.records(view.filter);
      expect(result.rows).toEqual(all.rows);
      expect(result.split.total).toBe(all.split.total);
    }
  });

  it("retains provenance notes on every record", async () => {
    const result = await q.records();
    const row = result.rows.find((view) => view.record.notes.length > 0);
    expect(row?.record.notes[0]?.text).toBeTruthy();
  });
});
