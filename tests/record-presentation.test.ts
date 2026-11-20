import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RecordsTable } from "@/components/wrt/shared/records";
import { SplitBar } from "@/components/wrt/shared/quantity";
import { SeasonColumns } from "@/components/wrt/shared/charts";
import { q } from "./helpers";

describe("uniform planting record presentation", () => {
  it("shows every note under Source and renders flagged records like all other records", async () => {
    const { rows } = await q.records();
    const row = rows.find((row) => row.record.needsReview && row.record.notes.length)!;
    const flagged = renderToStaticMarkup(createElement(RecordsTable, { rows: [row] }));
    const settled = renderToStaticMarkup(createElement(RecordsTable, { rows: [{ ...row, record: { ...row.record, needsReview: false } }] }));
    expect(flagged).toBe(settled);
    expect(flagged).toContain("<summary>Source</summary>");
    for (const note of row.record.notes) expect(flagged).toContain(note.text);
    expect(flagged).not.toMatch(/Needs review|Resolved|is-review|wrt-issue|<th>Status<\/th>/);
  });

  it("draws bars from the entire recorded quantity", () => {
    const split = { total: 80, resolved: 30, needsReview: 50, records: 2, recordsNeedingReview: 1 };
    const html = renderToStaticMarkup(createElement(SplitBar, { split, max: 100 }));
    expect(html).toContain('aria-label="80 recorded plants"');
    expect(html).toContain('width:80%');
    expect(html).not.toContain("review");
  });

  it("season charts do not change with historical review metadata", async () => {
    const overview = await q.overview();
    const all = renderToStaticMarkup(createElement(SeasonColumns, { points: overview.seasons }));
    const settled = renderToStaticMarkup(createElement(SeasonColumns, { points: overview.seasons.map((point) => ({ ...point, split: { ...point.split, resolved: point.split.total, needsReview: 0, recordsNeedingReview: 0 } })) }));
    expect(all).toBe(settled);
  });
});
