import { describe, expect, it, vi } from "vitest";
import { createQueries, splitOf } from "@/lib/wrt/queries";
import { parseRecordParams, recordsHref, exportHref } from "@/components/wrt/explore/filters";
import { seasonLabelFromPath, seasonPathKey } from "@/lib/wrt/text";
import { hrefs } from "@/components/wrt/shared/names";
import { recordsToCsv } from "@/lib/wrt/records-csv";
import { fixture, record } from "./explorer-fixture";

describe("database-backed explorer", () => {
  it("keeps catalogue entries and areas accessible without any history", async () => {
    const q = createQueries(async () => fixture());
    const o = await q.overview();
    expect(o).toMatchObject({ placeCount: 1, speciesCount: 1, parcelCount: 1, split: { total: 0, records: 0, unknown: 0 }, seasons: [] });
    expect(await q.places()).toHaveLength(1);
    expect(await q.speciesList()).toHaveLength(1);
    expect((await q.place("reserve"))?.parcels).toHaveLength(1);
    expect((await q.species("manuka"))?.span).toBeNull();
    expect((await q.search("manuka")).species).toHaveLength(1);
    expect((await q.search("reserve")).places).toHaveLength(1);
    expect(await q.place("missing")).toBeNull();
    expect(await q.species("missing")).toBeNull();
  });
  it("groups exact labels across years and derives year filters only from dates", async () => {
    const data = fixture();
    data.records = [record(), record({ id: "past", year: 2025, plantingDate: "2025-12-12", quantity: 3 }), record({ id: "undated", seasonSlug: "winter 1999", seasonName: "winter 1999", year: null, plantingDate: null, quantity: null }), record({ id: "case", seasonSlug: "Summer", seasonName: "Summer", quantity: 0 })];
    const q = createQueries(async () => data);
    expect((await q.seasons()).map((s) => s.season.name).sort()).toEqual(["Summer", "summer", "winter 1999"]);
    expect((await q.season("summer"))?.split.total).toBe(13);
    expect((await q.records({ year: 1999 })).rows).toHaveLength(0);
    expect((await q.lookups()).years).toEqual([2025, 2026]);
    expect((await q.place("reserve"))?.years.map((y) => y.year)).toEqual([2025, 2026]);
    expect((await q.records({ season: "winter 1999" })).rows[0].record.plantingDate).toBeNull();
  });
  it("lists and opens catalogue seasons before history is imported, without duplicating event labels", async () => {
    const data = fixture();
    data.seasons = ["Spring 2025", "Autumn 2025"];
    const q = createQueries(async () => data);
    expect((await q.lookups()).seasons.map((s) => s.label)).toEqual(["Autumn 2025", "Spring 2025"]);
    expect((await q.seasons()).every((s) => s.split.records === 0)).toBe(true);
    expect(await q.season("Autumn 2025")).toMatchObject({ records: [], split: { total: 0, records: 0, unknown: 0 } });
    expect((await q.search("Autumn 2025")).seasons).toHaveLength(1);
    data.records = [record({ seasonSlug: "Autumn 2025", seasonName: "Autumn 2025" }), record()];
    expect((await q.seasons()).map((s) => s.season.label)).toEqual(["Autumn 2025", "Spring 2025", "summer"]);
    expect((await q.season("Autumn 2025"))?.split.total).toBe(10);
  });
  it("keeps unknown quantities separate from zero and protects safe totals", () => {
    expect(splitOf([record({ quantity: null }), record({ quantity: 0 }), record()])).toEqual({ total: 10, records: 3, unknown: 1 });
    expect(() => splitOf([record({ quantity: Number.MAX_SAFE_INTEGER }), record()])).toThrow("safe integer");
  });
  it("scopes areas to their site while preserving events without areas", async () => {
    const data = fixture(); data.records = [record(), record({ id: "site", parcelId: null, parcelName: "", quantity: 2 })];
    const q = createQueries(async () => data);
    expect((await q.records({ place: "reserve", parcel: "upper" })).split.total).toBe(10);
    expect((await q.records({ parcel: "upper" })).rows).toHaveLength(0);
    expect((await q.records({ place: "reserve" })).split.total).toBe(12);
    expect((await q.place("reserve"))?.parcels[0].split.total).toBe(10);
  });
  it("round-trips arbitrary and blank season labels and rejects retired export filters", async () => {
    const data = fixture(); data.records = [record({ seasonName: "summer / wet", seasonSlug: "summer / wet" }), record({ id: "blank", seasonName: "", seasonSlug: "" })];
    const lookups = await createQueries(async () => data).lookups();
    for (const label of ["summer / wet", ""]) {
      const view = parseRecordParams({ seasonKey: `label-${label}` }, lookups);
      expect(view.filter.season).toBe(label);
      const url = new URL(recordsHref(view), "https://example.invalid");
      expect(parseRecordParams(Object.fromEntries(url.searchParams), lookups).filter.season).toBe(label);
      expect(new URL(exportHref(view), url).searchParams.get("season")).toBe(label);
      expect(seasonLabelFromPath(hrefs.season(label).split("/").at(-1)!)).toBe(label);
    }
    for (const label of ["Māori / winter", "summer~20", "%2F", "label-", "a/b"]) {
      expect(seasonLabelFromPath(seasonPathKey(label))).toBe(label);
      expect(hrefs.season(label)).not.toContain("%2F");
    }
    expect(parseRecordParams({ review: "needs-review" }, lookups).ignored).toHaveLength(1);
  });
  it("exports unknown counts and dates as empty cells, with no review columns", async () => {
    const data = fixture(); data.records = [record({ quantity: null, year: null, plantingDate: null })];
    const result = await createQueries(async () => data).records();
    const csv = recordsToCsv(result.rows);
    expect(csv).toContain("summer,,,Reserve");
    expect(csv).not.toContain("Needs review");
    expect(csv).toContain("Saved notes");
  });
  it("reads fresh on every query and propagates read failures", async () => {
    const data = fixture(); const load = vi.fn(async () => data); const q = createQueries(load);
    expect((await q.overview()).split.total).toBe(0);
    data.records.push(record());
    expect((await q.overview()).split.total).toBe(10);
    expect(load).toHaveBeenCalledTimes(2);
    await expect(createQueries(async () => { throw new Error("Database unavailable"); }).overview()).rejects.toThrow("Database unavailable");
  });
});
