import { describe, expect, it } from "vitest";
import dump from "@/data/seasons.json";
import { readSeasonSeeds } from "@/scripts/workbook/seasons";

describe("workbook season seeds", () => {
  it("preserves all dump fields and resolves historical season references", () => {
    expect(readSeasonSeeds([{ seasonSlug: "autumn-2015" }, { seasonSlug: "autumn-2026" }])).toEqual(dump);
  });

  it("includes both halves of the next two years without inventing workbook totals", () => {
    const seasons = readSeasonSeeds([]);
    for (const year of [2027, 2028]) {
      for (const half of ["autumn", "spring"]) {
        expect(seasons.find((season) => season.slug === `${half}-${year}`)).toMatchObject({
          year, half, workbook_total: null, workbook_cell: null,
        });
      }
    }
  });

  it("rejects missing seasons and conflicting seed identities before writes", () => {
    const season = dump[0]!;
    expect(() => readSeasonSeeds([{ seasonSlug: "spring-2099" }])).toThrow("missing from data/seasons.json");
    expect(() => readSeasonSeeds([], [season, { ...season, slug: "different" }])).toThrow("Duplicate id");
    expect(() => readSeasonSeeds([], [season, { ...season, id: 99 }])).toThrow("Duplicate slug");
    expect(() => readSeasonSeeds([], [{ ...season, half: "summer" }])).toThrow();
    expect(() => readSeasonSeeds([], [{ ...season, year: 2099 }])).toThrow("Invalid or duplicate season");
  });
});
