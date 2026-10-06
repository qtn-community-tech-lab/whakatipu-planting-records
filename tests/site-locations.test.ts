import { describe, expect, it } from "vitest";
import { compactPlantCount, groupNearbyLocations, locationBounds, locationMapUrl, locationsForSites, siteLocations } from "@/lib/wrt/site-locations";
import { q, repo } from "./helpers";

describe("public site reference locations", () => {
  it("groups overlapping points without hiding isolated locations or losing chain neighbours", () => {
    expect(groupNearbyLocations([{ x: 0, y: 0 }, { x: 45, y: 0 }, { x: 90, y: 0 }, { x: 300, y: 100 }]))
      .toEqual([[0, 1, 2], [3]]);
    expect(groupNearbyLocations([{ x: 0, y: 0 }, { x: 90, y: 0 }])).toEqual([[0], [1]]);
    expect(groupNearbyLocations([])).toEqual([]);
  });
  it("maps the ten largest historical groups to actual physical sites", async () => {
    const sites = (await q.places()).filter((site) => !site.item.isScheme);
    const records = await repo.listRecords();
    const mapped = locationsForSites(sites.map((site) => site.item), records);
    const slugs = new Set(mapped.map((location) => location.siteSlug));
    for (const site of sites.slice(0, 10)) expect(slugs.has(site.item.slug), site.item.name).toBe(true);
    expect(mapped).toHaveLength(siteLocations.length);
    expect(new Set(mapped.map((location) => location.id)).size).toBe(mapped.length);
    expect(locationsForSites([{ slug: "paper4trees", name: "Paper4Trees" }], records)).toEqual([]);
    for (const location of siteLocations) {
      const site = sites.find((site) => site.item.slug === location.siteSlug)!;
      for (const id of location.parcelIds ?? []) expect(site.item.parcels.some((part) => part.id === id), `${location.label}: ${id}`).toBe(true);
    }
  });

  it("keeps every point in the Whakatipu basin with public source provenance", () => {
    for (const location of siteLocations) {
      expect(location.latitude, location.label).toBeGreaterThan(-45.2);
      expect(location.latitude, location.label).toBeLessThan(-44.8);
      expect(location.longitude, location.label).toBeGreaterThan(168.4);
      expect(location.longitude, location.label).toBeLessThan(169);
      expect(["historic-event", "landmark"]).toContain(location.precision);
      expect(new URL(location.sourceUrl).protocol).toBe("https:");
      expect(new URL(location.coordinateSourceUrl).protocol).toBe("https:");
      expect(location.description.length).toBeGreaterThan(30);
    }
  });

  it("preserves the organizer's historic anchor points and coordinate axis order", () => {
    const whitechapel = siteLocations.find((p) => p.id === "whitechapel-reserve")!;
    const slopeHill = siteLocations.find((p) => p.id === "slope-hill-riparian")!;
    expect([whitechapel.latitude, whitechapel.longitude]).toEqual([-44.9736, 168.8546]);
    expect([slopeHill.latitude, slopeHill.longitude]).toEqual([-44.9716, 168.7985]);
    expect(locationBounds([whitechapel, slopeHill])).toEqual([[168.7985, -44.9736], [168.8546, -44.9716]]);
    expect(new URL(locationMapUrl(whitechapel)).searchParams.get("query")).toBe("-44.9736,168.8546");
    expect(locationBounds([])).toBeNull();
  });

  it("keeps dispersed locations distinct and respects the visible site filter", () => {
    const gorge = locationsForSites([{ slug: "gorge-road-area", name: "Gorge Road area" }], []);
    expect(gorge.length).toBeGreaterThan(1);
    expect(gorge.every((p) => p.siteSlug === "gorge-road-area")).toBe(true);
    const bounds = locationBounds(gorge)!;
    expect(bounds[1][0] - bounds[0][0]).toBeGreaterThan(0.01);
    expect(locationsForSites([], [])).toEqual([]);
  });

  it("counts mapped parts without duplicating whole-site totals, and follows the record scope", async () => {
    const records = await repo.listRecords();
    const sites = (await q.places()).map((site) => site.item);
    const all = locationsForSites(sites, records);
    const confirmed = locationsForSites(sites, records.filter((record) => !record.needsReview));
    expect(all.find((p) => p.id === "whitechapel-reserve")!.split.total).toBe(27204);
    expect(confirmed.find((p) => p.id === "whitechapel-reserve")!.split.total).toBe(26273);
    expect(all.find((p) => p.id === "lake-hayes-south-wetland")!.split.total).toBe(7082);
    expect(all.find((p) => p.id === "lake-hayes-pavilion")!.split.total).toBe(5743);
    expect(all.filter((p) => p.siteSlug === "gorge-road-area").reduce((sum, p) => sum + p.split.total, 0)).toBe(4457);
    for (const point of all) expect(point.split.total).toBe(point.split.resolved + point.split.needsReview);
    expect(compactPlantCount(1200)).toBe("1.2k");
    expect(compactPlantCount(26273)).toBe("26.3k");
    expect(compactPlantCount(74)).toBe("74");
  });
});
