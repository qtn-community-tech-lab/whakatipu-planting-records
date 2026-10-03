import { describe, expect, it } from "vitest";
import { q } from "./helpers";

/**
 * "UI never sees IDs": species ids (SP-042) and provisional parcel ids (NEW-…)
 * are join keys. Any string a page could render as a name must not look like one.
 */
const ID_LIKE = /^(SP-\d+|NEW-.*)$/i;
const DISPLAY_KEYS = new Set(["displayName", "name", "commonName", "maoriName", "scientificName", "parcelName", "label"]);

function walk(value: unknown, path: string, bad: string[], seen = new Set<object>()) {
  if (!value || typeof value !== "object" || seen.has(value as object)) return;
  seen.add(value as object);
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string") {
      if (DISPLAY_KEYS.has(k) && ID_LIKE.test(v.trim())) bad.push(`${path}.${k} = ${v}`);
    } else {
      walk(v, `${path}.${k}`, bad, seen);
    }
  }
}

describe("the UI never sees IDs", () => {
  it("no display string in the summary functions looks like an id", async () => {
    const bad: string[] = [];
    walk(await q.overview(), "overview", bad);
    walk(await q.places(), "places", bad);
    walk(await q.speciesList(), "speciesList", bad);
    walk(await q.seasons(), "seasons", bad);
    walk(await q.lookups(), "lookups", bad);
    walk(await q.dataQuality(), "dataQuality", bad);
    walk(await q.search("a", 50), "search:a", bad);
    expect(bad).toEqual([]);
  });

  it("no display string in any place, species or season detail looks like an id", async () => {
    const bad: string[] = [];
    for (const p of await q.places()) walk(await q.place(p.item.slug), `place:${p.item.slug}`, bad);
    for (const s of await q.speciesList()) walk(await q.species(s.item.slug), `species:${s.item.slug}`, bad);
    for (const s of await q.seasons()) walk(await q.season(s.season.slug), `season:${s.season.slug}`, bad);
    expect(bad).toEqual([]);
  });

  it("the record rows a table renders carry real names", async () => {
    const bad: string[] = [];
    walk((await q.records()).rows, "records", bad);
    expect(bad).toEqual([]);
  });

  it("every species and parcel has a human-readable name", async () => {
    const o = await q.overview();
    for (const s of o.species) expect(s.item.displayName.trim().length).toBeGreaterThan(2);
    for (const p of await q.places()) {
      const d = await q.place(p.item.slug);
      for (const parcel of d!.parcels) expect(parcel.item.name.trim().length, `${p.item.slug} parcel`).toBeGreaterThan(1);
    }
  });

  it("the guard itself catches an id-like name", () => {
    const bad: string[] = [];
    walk({ item: { displayName: "SP-042" }, parcel: { name: "NEW-LH-1" } }, "x", bad);
    expect(bad).toHaveLength(2);
  });
});
