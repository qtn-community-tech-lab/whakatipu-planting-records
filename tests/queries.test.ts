import { defined } from "./assertions";
import { describe, expect, it } from "vitest";
import { expectCoherentSplit, q, repo } from "./helpers";
import { needsReviewByPlants, splitOf } from "@/lib/wrt/queries";
import type { QuantitySplit } from "@/lib/wrt/types";

const SPLIT_KEYS = ["total", "resolved", "needsReview", "records", "recordsNeedingReview"];

/** Find every QuantitySplit inside a query result, with its path. */
function findSplits(value: unknown, path = "$", out: [string, QuantitySplit][] = [], seen = new Set<object>()) {
  if (!value || typeof value !== "object" || seen.has(value as object)) return out;
  seen.add(value as object);
  const o = value as Record<string, unknown>;
  if (!Array.isArray(value) && SPLIT_KEYS.every((k) => typeof o[k] === "number")) {
    out.push([path, value as QuantitySplit]);
    return out;
  }
  for (const [k, v] of Object.entries(o)) findSplits(v, `${path}.${k}`, out, seen);
  return out;
}

function expectAllCoherent(result: unknown, label: string) {
  const splits = findSplits(result, label);
  expect(splits.length, `${label} should contain splits`).toBeGreaterThan(0);
  for (const [path, s] of splits) expectCoherentSplit(s, path);
}

describe("overview", () => {
  it("matches the known totals", async () => {
    const o = await q.overview();
    expect(o.split).toEqual({ total: 140068, resolved: 124778, needsReview: 15290, records: 5449, recordsNeedingReview: 629 });
    expect(o.seasons).toHaveLength(23);
    expect(o.firstSeason.label).toBe("Autumn 2015");
    expect(o.lastSeason.label).toBe("Autumn 2026");
    expect(o.placeCount).toBe(38);
    expect(o.schemeCount).toBe(1);
    expect(o.speciesCount).toBe(95);
  });

  it("splits add up wherever they appear", async () => {
    expectAllCoherent(await q.overview(), "overview");
  });

  it("every breakdown adds back to the grand total", async () => {
    const o = await q.overview();
    const sum = (rows: { split: QuantitySplit }[]) => rows.reduce((a, r) => a + r.split.total, 0);
    const sumRecords = (rows: { split: QuantitySplit }[]) => rows.reduce((a, r) => a + r.split.records, 0);
    for (const [name, rows] of [
      ["places", o.places], ["species", o.species], ["seasons", o.seasons], ["byClass", o.byClass],
      ["byConfidence", o.byConfidence], ["byPrecision", o.byPrecision],
    ] as const) {
      expect(sum(rows as { split: QuantitySplit }[]), name).toBe(o.split.total);
      expect(sumRecords(rows as { split: QuantitySplit }[]), `${name} records`).toBe(o.split.records);
    }
  });

  it("lists places and species largest first", async () => {
    const o = await q.overview();
    for (const rows of [o.places, o.species]) {
      for (let i = 1; i < rows.length; i++) expect(defined(rows[i - 1]).split.total).toBeGreaterThanOrEqual(defined(rows[i]).split.total);
    }
  });

  it("theme figures overlap: they can add to more than the review total, never less", async () => {
    const o = await q.overview();
    const sum = o.themes.reduce((a, t) => a + t.split.needsReview, 0);
    expect(sum).toBeGreaterThanOrEqual(o.split.needsReview);
    for (const t of o.themes) {
      expect(t.split.needsReview).toBe(t.split.total); // theme splits only hold flagged records
      expect(t.split.needsReview).toBeLessThanOrEqual(o.split.needsReview);
    }
  });

  it("no longer lists Slope Hill 2024 as a question: WRT ruled it real", async () => {
    const o = await q.overview();
    expect(o.themes.find((x) => x.theme === "slope-hill-2024")).toBeUndefined();
  });
});

describe("places", () => {
  it("sum of place totals equals the grand total", async () => {
    const places = await q.places();
    expect(places.reduce((a, p) => a + p.split.total, 0)).toBe(140068);
    expect(places.reduce((a, p) => a + p.split.records, 0)).toBe(5449);
    expectAllCoherent(places, "places");
  });

  it("every place detail is coherent and its parcels add back to the place", async () => {
    for (const p of await q.places()) {
      const d = await q.place(p.item.slug);
      expect(d, p.item.slug).not.toBeNull();
      expect(d!.split).toEqual(p.split);
      expect(d!.parcels.reduce((a, x) => a + x.split.total, 0), `${p.item.slug} parcels`).toBe(d!.split.total);
      expect(d!.species.reduce((a, x) => a + x.split.total, 0), `${p.item.slug} species`).toBe(d!.split.total);
      expect(d!.seasons.reduce((a, x) => a + x.split.total, 0), `${p.item.slug} seasons`).toBe(d!.split.total);
      expect(d!.years.at(-1)?.runningTotal.total, `${p.item.slug} running`).toBe(d!.split.total);
      expect(d!.records).toHaveLength(d!.split.records);
      expectAllCoherent(d, `place:${p.item.slug}`);
    }
  });

  it("returns null for an unknown slug", async () => {
    expect(await q.place("atlantis")).toBeNull();
  });
});

describe("species", () => {
  it("sum of species totals equals the grand total", async () => {
    const list = await q.speciesList();
    expect(list.reduce((a, s) => a + s.split.total, 0)).toBe(140068);
    expectAllCoherent(list, "speciesList");
  });

  it("every species detail is coherent and adds back", async () => {
    for (const s of await q.speciesList()) {
      const d = await q.species(s.item.slug);
      expect(d, s.item.slug).not.toBeNull();
      expect(d!.split).toEqual(s.split);
      expect(d!.places.reduce((a, x) => a + x.split.total, 0), `${s.item.slug} places`).toBe(d!.split.total);
      expect(d!.seasons.reduce((a, x) => a + x.split.total, 0), `${s.item.slug} seasons`).toBe(d!.split.total);
    }
  });

  it("returns null for an unknown slug", async () => {
    expect(await q.species("not-a-plant")).toBeNull();
  });

  it("gives mānuka its own page by scientific slug", async () => {
    const d = await q.species("leptospermum-scoparium");
    expect(d?.species.displayName).toBe("Mānuka");
    expect(d!.split.total).toBeGreaterThan(0);
  });
});

describe("seasons", () => {
  it("sum of season totals equals the grand total", async () => {
    const seasons = await q.seasons();
    expect(seasons).toHaveLength(23);
    expect(seasons.reduce((a, s) => a + s.split.total, 0)).toBe(140068);
    expectAllCoherent(seasons, "seasons");
  });

  it("every season total equals its reconciliation row", async () => {
    for (const s of await q.seasons()) {
      expect(s.reconciliation, s.season.label).not.toBeNull();
      expect(s.split.total, s.season.label).toBe(s.reconciliation!.generated);
      expect(s.reconciliation!.difference).toBe(0);
    }
  });

  it("every season detail is coherent, linked in order and adds back", async () => {
    const all = await q.seasons();
    for (const s of all) {
      const d = await q.season(s.season.slug);
      expect(d, s.season.slug).not.toBeNull();
      expect(d!.split).toEqual(s.split);
      expect(d!.places.reduce((a, x) => a + x.split.total, 0)).toBe(d!.split.total);
      expect(d!.species.reduce((a, x) => a + x.split.total, 0)).toBe(d!.split.total);
      expect(d!.previous?.order ?? -1).toBe(s.season.order - 1 < 0 ? -1 : s.season.order - 1);
      expect(d!.next?.order ?? -1).toBe(s.season.order + 1 >= all.length ? -1 : s.season.order + 1);
      expectAllCoherent(d, `season:${s.season.slug}`);
    }
  });

  it("returns null for an unknown slug", async () => {
    expect(await q.season("autumn-1999")).toBeNull();
  });
});

describe("records()", () => {
  it("returns everything with no filter", async () => {
    const r = await q.records();
    expect(r.rows).toHaveLength(5449);
    expect(r.split.total).toBe(140068);
    expectAllCoherent(r, "records");
  });

  it("answers Whitechapel 2019: 2,105 recorded plants, 136 needing review, 54 records, 32 species", async () => {
    const r = await q.records({ place: "whitechapel", year: 2019 });
    expect(r.split.total).toBe(2105);
    expect(r.split.needsReview).toBe(136);
    expect(r.split.records).toBe(54);
    expect(new Set(r.rows.map((x) => x.species.id)).size).toBe(32);
    expectCoherentSplit(r.split);
  });

  it("the split always describes exactly the rows returned", async () => {
    for (const f of [{ place: "whitechapel" }, { year: 2024 }, { review: "needs-review" as const }, { q: "manuka" }]) {
      const r = await q.records(f);
      expect(r.split).toEqual(splitOf(r.rows.map((v) => v.record)));
    }
  });

  it("filters compose as an intersection", async () => {
    const ids = async (f: Parameters<typeof q.records>[0]) => new Set((await q.records(f)).rows.map((r) => r.record.id));
    const place = await ids({ place: "whitechapel" });
    const year = await ids({ year: 2019 });
    const season = await ids({ season: "Spring" });
    const review = await ids({ review: "needs-review" });
    const both = await ids({ place: "whitechapel", year: 2019 });
    expect(both).toEqual(new Set([...place].filter((x) => year.has(x))));
    const three = await ids({ place: "whitechapel", year: 2019, season: "Spring" });
    expect(three).toEqual(new Set([...both].filter((x) => season.has(x))));
    const four = await ids({ place: "whitechapel", year: 2019, season: "Spring", review: "needs-review" });
    expect(four).toEqual(new Set([...three].filter((x) => review.has(x))));
    expect(four.size).toBeLessThanOrEqual(three.size);
    expect(three.size).toBeLessThanOrEqual(both.size);
  });

  it("resolved and needs-review partition the whole", async () => {
    const all = await q.records();
    const a = await q.records({ review: "needs-review" });
    const b = await q.records({ review: "resolved" });
    expect(a.split.records + b.split.records).toBe(all.split.records);
    expect(a.split.total + b.split.total).toBe(all.split.total);
    expect(a.split.records).toBe(629);
    expect(a.split.total).toBe(15290);
    expect(a.split.resolved).toBe(0);
    expect(b.split.needsReview).toBe(0);
  });

  it("autumn and spring partition a year", async () => {
    const y = await q.records({ year: 2019 });
    const a = await q.records({ year: 2019, season: "Autumn" });
    const s = await q.records({ year: 2019, season: "Spring" });
    expect(a.split.total + s.split.total).toBe(y.split.total);
    expect(a.split.records + s.split.records).toBe(y.split.records);
  });

  it("filters by species slug", async () => {
    const r = await q.records({ species: "leptospermum-scoparium" });
    const d = await q.species("leptospermum-scoparium");
    expect(r.split).toEqual(d!.split);
  });

  it("an unknown species slug matches nothing, rather than everything", async () => {
    const r = await q.records({ species: "nonexistent-plant" });
    expect(r.rows).toHaveLength(0);
    expect(r.split.total).toBe(0);
  });

  it("filters by review theme to flagged records only", async () => {
    const r = await q.records({ theme: "order-scheme" });
    expect(r.split.total).toBe(1457);
    expect(r.rows.every((v) => v.record.needsReview)).toBe(true);
  });

  it("free text matches species, place and parcel names, ignoring macrons", async () => {
    const a = await q.records({ q: "manuka" });
    const b = await q.records({ q: "Mānuka" });
    expect(a.split).toEqual(b.split);
    expect(a.rows.length).toBeGreaterThan(0);
    expect((await q.records({ q: "whitechapel" })).split.records).toBeGreaterThan(0);
  });

  it("an empty result is a coherent zero split", async () => {
    const r = await q.records({ place: "whitechapel", year: 2015 });
    if (r.rows.length === 0) expect(r.split).toEqual({ total: 0, resolved: 0, needsReview: 0, records: 0, recordsNeedingReview: 0 });
    expectCoherentSplit(r.split);
  });

  it("the 'TBC' record carries no quantity but is still a record needing review", async () => {
    const all = await q.records({ review: "needs-review" });
    const tbc = all.rows.filter((v) => !v.record.hasQuantity);
    expect(tbc).toHaveLength(1);
    expect(defined(tbc[0]).record.quantity).toBe(0);
  });
});

describe("dataQuality()", () => {
  it("agrees with the overview and keeps splits coherent", async () => {
    const dq = await q.dataQuality();
    const o = await q.overview();
    expect(dq.split).toEqual(o.split);
    expectAllCoherent(dq.byConfidence, "byConfidence");
    expectAllCoherent(dq.byPrecision, "byPrecision");
    expect(dq.byPrecision.reduce((a, r) => a + r.split.total, 0)).toBe(140068);
    expect(dq.byConfidence.reduce((a, r) => a + r.split.total, 0)).toBe(140068);
  });

  it("reports load health and the reconciliation rows", async () => {
    const dq = await q.dataQuality();
    expect(dq.issues.errors).toBe(0);
    expect(dq.reconciliation.filter((r) => r.kind === "season")).toHaveLength(23);
    expect(dq.source.files.length).toBeGreaterThan(0);
  });
});

describe("lookups()", () => {
  it("lists only species that have records, sorted by display name", async () => {
    const l = await q.lookups();
    expect(l.seasons).toHaveLength(23);
    expect(l.years[0]).toBe(2015);
    expect(l.years.at(-1)).toBe(2026);
    expect(l.species).toHaveLength(95);
    for (let i = 1; i < l.species.length; i++) {
      expect(defined(l.species[i - 1]).displayName.localeCompare(defined(l.species[i]).displayName)).toBeLessThanOrEqual(0);
    }
  });
});

describe("the query layer reads through the repository only", () => {
  it("records returned are the repository's records", async () => {
    const repoIds = new Set((await repo.listRecords()).map((r) => r.id));
    for (const v of (await q.records()).rows) expect(repoIds.has(v.record.id)).toBe(true);
  });
});

// The numbers the chat must give, checked against the queries its tools wrap. No model needed.
describe("chat golden questions", () => {
  it("Whitechapel 2019", async () => {
    const r = await q.records({ place: "whitechapel", year: 2019 });
    expect([r.split.total, r.split.needsReview]).toEqual([2105, 136]);
  });

  it("mānuka, all seasons", async () => {
    const r = await q.records({ species: "leptospermum-scoparium" });
    expect([r.split.total, r.split.needsReview]).toEqual([2182, 148]);
  });

  it("kanuka never returns mānuka", async () => {
    const r = await q.search("kanuka");
    expect(r.species.map((s) => s.item.slug)).not.toContain("leptospermum-scoparium");
  });

  it("a site that doesn't exist finds nothing", async () => {
    expect((await q.search("bobs cove")).places).toHaveLength(0);
  });

  it("two-letter queries find nothing", async () => {
    const r = await q.search("ka");
    expect(r.places.length + r.species.length).toBe(0);
  });

  it("Autumn 2026 has 11 places", async () => {
    expect((await q.season("autumn-2026"))?.places).toHaveLength(11);
  });

  it("the Slope Hill 2024 columns hold 29,000 confirmed plants", async () => {
    const slope = (await q.records()).rows.filter((v) => v.record.notes.some((n) => n.text.startsWith("decision 4 ruled")));
    expect(slope).toHaveLength(38);
    expect(slope.reduce((n, v) => n + v.record.quantity, 0)).toBe(29000);
    expect(slope.every((v) => !v.record.needsReview)).toBe(true);
  });
});

describe("needsReviewByPlants", () => {
  it("keeps only flagged rows, largest first, and drops none", async () => {
    const { rows } = await q.records({});
    const out = needsReviewByPlants(rows);
    expect(out.length).toBe(rows.filter((v) => v.record.needsReview).length);
    expect(out.every((v) => v.record.needsReview)).toBe(true);
    for (let i = 1; i < out.length; i++) expect(defined(out[i - 1]).record.quantity).toBeGreaterThanOrEqual(defined(out[i]).record.quantity);
  });
});
