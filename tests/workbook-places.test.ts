import { describe, expect, it } from "vitest";
import { readPlaceSeeds, workbookAreaSlugs } from "@/scripts/workbook/places";
import sites from "@/data/sites.json";
import areas from "@/data/site_areas.json";
import type { Place } from "@/lib/wrt/types";

const place: Place = {
  slug: "whitechapel", name: "Workbook name", siteClasses: [], searchKeys: [],
  parcels: [{ id: "15", name: "Workbook area name", slug: "whitechapel", placeSlug: "whitechapel", siteClass: "unknown", aliases: [] }],
};

describe("workbook site and area seeds", () => {
  it("preserves every non-audit dump field including coordinates and saved slugs", () => {
    const seeds = readPlaceSeeds();
    for (const [dump, seed] of [[sites, seeds.sites], [areas, seeds.areas]] as const) {
      expect(seed).toHaveLength(dump.length);
      dump.forEach((row, index) => {
        expect(seed[index]).toEqual(Object.fromEntries(Object.entries(row).filter(([key]) => !["created_at", "created_by", "updated_at", "updated_by"].includes(key))));
      });
    }
    expect(workbookAreaSlugs([place]).get("whitechapel|15")).toBe("whitechapel-reserve");
  });

  it("rejects missing or ambiguous workbook area matches before writes", () => {
    expect(() => workbookAreaSlugs([{ ...place, slug: "missing" }])).toThrow("missing from data/sites.json");
    expect(() => workbookAreaSlugs([{ ...place, parcels: [{ ...place.parcels[0]!, id: "missing" }] }])).toThrow("0 matches");
    const seeds = readPlaceSeeds();
    const area = seeds.areas.find((row) => row.slug === "whitechapel-reserve")!;
    expect(() => workbookAreaSlugs([place], { ...seeds, areas: [...seeds.areas, { ...area, slug: "duplicate" }] })).toThrow("2 matches");
  });

  it("matches unnumbered areas by their saved site and name", () => {
    const area = areas.find((row) => row.wrt_number === null)!;
    expect(workbookAreaSlugs([{ ...place, slug: area.site, parcels: [{ ...place.parcels[0]!, id: "NEW-1", name: area.name }] }]).get(`${area.site}|NEW-1`)).toBe(area.slug);
  });

  it("uses the confirmed Bush Creek numbers and omits the unused Shotover area", () => {
    const { areas } = readPlaceSeeds();
    expect(areas.some((area) => area.slug === "shotover-river")).toBe(false);
    for (const [slug, number] of [
      ["bush-creek-keystone", "13"], ["bush-creek-arrowtown-preschool", "13A"],
      ["arrowtown-primary", "13B"], ["derby-street-reserve", "13C"],
    ]) {
      expect(areas.find((area) => area.slug === slug)?.wrt_number).toBe(number);
    }
    const numbered = areas.filter((area) => area.wrt_number !== null)
      .map((area) => `${area.site}|${area.wrt_number}`);
    expect(new Set(numbered).size).toBe(numbered.length);
    expect(areas.find((area) => area.slug === "tucker-beach")?.wrt_number).toBe("28");
    expect(areas.find((area) => area.slug === "tucker-beach-and-shotover-river-shotover-river")?.wrt_number).toBe("28A");
    expect(areas.find((area) => area.slug === "wharehuanui-trail")?.wrt_number).toBe("6C");
    expect(areas.find((area) => area.slug === "lake-hayes-akarua-corner")?.wrt_number).toBe("9E");
    expect(areas.find((area) => area.slug === "lake-hayes-north-akarua-corner")?.wrt_number).toBe("9F");
  });
});
