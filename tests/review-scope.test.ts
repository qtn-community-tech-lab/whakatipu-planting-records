import { describe, expect, it } from "vitest";
import { expectCoherentSplit, q, repo } from "./helpers";
import { createQueries } from "@/lib/wrt/queries";
import { confirmedOnly } from "@/lib/wrt/review-scope";

const confirmed = createQueries(confirmedOnly(repo));

describe("confirmed-only view", () => {
  it("counts resolved records alone", async () => {
    const [all, only] = await Promise.all([q.overview(), confirmed.overview()]);
    expectCoherentSplit(only.split);
    expect(only.split).toEqual({
      total: all.split.resolved,
      resolved: all.split.resolved,
      needsReview: 0,
      records: all.split.records - all.split.recordsNeedingReview,
      recordsNeedingReview: 0,
    });
    expect(only.themes).toEqual([]);
  });

  it("returns no record that needs review, whatever the filter asks for", async () => {
    expect((await confirmed.records()).rows.every((v) => !v.record.needsReview)).toBe(true);
    expect((await confirmed.records({ review: "needs-review" })).rows).toEqual([]);
  });

  it("drops sites with only records needing review and keeps the full species register", async () => {
    const [allPlaces, places, allSpecies, species] = await Promise.all([
      q.places(), confirmed.places(), q.speciesList(), confirmed.speciesList(),
    ]);
    expect(places.length).toBeLessThan(allPlaces.length);
    expect(species.map((row) => row.item.id).sort()).toEqual(allSpecies.map((row) => row.item.id).sort());
    expect(species.some((row) => row.span === null)).toBe(true);
    for (const row of species) expect(row.split.needsReview).toBe(0);
    for (const p of places) expect(p.split.needsReview).toBe(0);
  });

  it("makes no workbook comparison, since the workbook totals include what is left out", async () => {
    expect((await confirmed.seasons()).every((s) => s.reconciliation === null)).toBe(true);
  });
});
