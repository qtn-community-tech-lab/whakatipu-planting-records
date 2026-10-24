import { describe, expect, it } from "vitest";
import { q, expectCoherentSplit } from "./helpers";
import { parseRecordParams, recordsHref, exportHref } from "@/components/wrt/explore/filters";

describe("exact site-part filtering", () => {
  it("opens Gorge Rd Wetlands alone, retaining its unresolved location notes", async () => {
    const site = (await q.place("gorge-road-area"))!;
    const wetlands = site.parcels.find((p) => p.item.name.includes("Wetlands"))!;
    const result = await q.records({ place: site.place.slug, parcel: wetlands.item.slug });
    expect(result.split).toEqual(wetlands.split);
    expect(result.rows).toHaveLength(4);
    expect(result.split.total).toBe(35);
    expect(new Set(result.rows.map((r) => r.species.scientificName))).toEqual(new Set([
      "Carex secta", "Olearia bullata", "Austroderia richardii", "Phormium tenax",
    ]));
    expect(result.rows.every((r) => r.record.parcelName === wetlands.item.name)).toBe(true);
  });

  it("every part opens the same records and totals shown on its parent site", async () => {
    for (const place of await q.places()) {
      const detail = (await q.place(place.item.slug))!;
      for (const parcel of detail.parcels) {
        const result = await q.records({ place: place.item.slug, parcel: parcel.item.slug });
        expect(result.split).toEqual(parcel.split);
        expect(result.rows.map((r) => r.record.id).sort()).toEqual(
          detail.records.filter((r) => r.record.parcelId === parcel.item.id).map((r) => r.record.id).sort(),
        );
        expectCoherentSplit(result.split);
      }
    }
  });

  it("requires the parent site and intersects with other record filters", async () => {
    const site = (await q.place("gorge-road-area"))!;
    const parcel = site.parcels.find((p) => p.item.name.includes("Wetlands"))!.item.slug;
    expect((await q.records({ parcel })).rows).toHaveLength(0);
    expect((await q.records({ place: site.place.slug, parcel: "missing-part" })).rows).toHaveLength(0);
    const result = await q.records({ place: site.place.slug, parcel, species: "carex-secta", season: "Spring 2016" });
    expect(result.rows).toHaveLength(1);
    expect(result.split.total).toBe(13);
  });

  it("validates part URLs and preserves them in sorting, paging and CSV links", async () => {
    const lookups = await q.lookups();
    const site = lookups.places.find((p) => p.slug === "gorge-road-area")!;
    const parcel = site.parcels.find((p) => p.name.includes("Wetlands"))!.slug;
    const view = parseRecordParams({ place: site.slug, parcel, page: "3" }, lookups);
    expect(view.ignored).toEqual([]);
    expect(view.filter.parcel).toBe(parcel);
    expect(new URL(recordsHref(view, { sort: "plants" }), "http://localhost").searchParams.get("parcel")).toBe(parcel);
    expect(new URL(recordsHref(view, { page: 2 }), "http://localhost").searchParams.get("parcel")).toBe(parcel);
    expect(new URL(exportHref(view), "http://localhost").searchParams.get("parcel")).toBe(parcel);
    const removePart = new URL(recordsHref(view, { parcel: undefined }), "http://localhost");
    expect(removePart.searchParams.get("place")).toBe(site.slug);
    expect(removePart.searchParams.has("parcel")).toBe(false);
    expect(removePart.searchParams.has("page")).toBe(false);
    expect(new URL(recordsHref(view, { place: "whitechapel" }), "http://localhost").searchParams.has("parcel")).toBe(false);
    expect(new URL(recordsHref(view, { place: undefined }), "http://localhost").searchParams.has("parcel")).toBe(false);
    for (const raw of [{ parcel }, { place: "whitechapel", parcel }, { place: site.slug, parcel: "missing-part" }]) {
      const invalid = parseRecordParams(raw, lookups);
      expect(invalid.filter.parcel).toBeUndefined();
      expect(invalid.ignored.some((i) => i.param === "part of site")).toBe(true);
    }
  });
});
