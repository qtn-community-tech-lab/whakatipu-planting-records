import { describe, expect, it } from "vitest";
import { q } from "./helpers";

describe("search", () => {
  it("finds mānuka by 'manuka' and 'mānuka' alike", async () => {
    for (const term of ["manuka", "mānuka", "MANUKA", "Mānuka"]) {
      const r = await q.search(term);
      expect(r.species[0]?.item.slug, term).toBe("leptospermum-scoparium");
      expect(r.species[0].item.displayName).toBe("Mānuka");
    }
  });

  it("finds Kōwhai even when kowhai is mistyped 'kowhia'", async () => {
    const r = await q.search("kowhia");
    expect(r.species.map((s) => s.item.displayName)).toContain("Kōwhai");
  });

  it("finds Whitechapel from 'white chapel' and from its abbreviation 'wcr'", async () => {
    for (const term of ["white chapel", "whitechapel", "wcr"]) {
      const r = await q.search(term);
      expect(r.places.map((p) => p.item.name), term).toContain("Whitechapel");
    }
  });

  it("finds both 2019 seasons from '2019'", async () => {
    const r = await q.search("2019");
    expect(r.seasons.map((s) => s.season.label)).toEqual(["Autumn 2019", "Spring 2019"]);
  });

  it("finds a season by its full label", async () => {
    const r = await q.search("autumn 2024");
    expect(r.seasons[0].season.slug).toBe("autumn-2024");
  });

  it("finds a species by scientific name", async () => {
    const r = await q.search("leptospermum");
    expect(r.species.map((s) => s.item.slug)).toContain("leptospermum-scoparium");
  });

  it("returns nothing for an empty or blank query", async () => {
    for (const term of ["", "   ", "\n"]) {
      const r = await q.search(term);
      expect(r.places).toEqual([]);
      expect(r.species).toEqual([]);
      expect(r.seasons).toEqual([]);
    }
  });

  it("returns nothing for nonsense", async () => {
    const r = await q.search("qqzzxxww");
    expect(r.places.length + r.species.length + r.seasons.length).toBe(0);
  });

  it("respects the limit and returns results with coherent splits", async () => {
    const r = await q.search("a", 3);
    expect(r.places.length).toBeLessThanOrEqual(3);
    expect(r.species.length).toBeLessThanOrEqual(3);
    for (const x of [...r.places, ...r.species]) {
      expect(x.split.total).toBe(x.split.resolved + x.split.needsReview);
      expect(x.split.records).toBeGreaterThan(0);
    }
  });

  it("ranks the better match first", async () => {
    const r = await q.search("manuka");
    for (let i = 1; i < r.species.length; i++) expect(r.species[i - 1].score).toBeGreaterThanOrEqual(r.species[i].score);
  });
});
