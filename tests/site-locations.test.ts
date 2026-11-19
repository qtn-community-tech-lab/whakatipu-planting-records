import { describe, expect, it } from "vitest";
import { compactPlantCount, groupNearbyLocations, locationBounds, locationMapUrl, locationsForSites as mapLocationsForSites, type PlantingAreaPin } from "@/lib/wrt/site-locations";
import areaSeed from "@/data/site_areas.json";
import { regionMapOptions } from "@/lib/wrt/map-region";
import type { PlantingRecord } from "@/lib/wrt/types";
import { splitOf } from "@/lib/wrt/queries";
import { q, repo } from "./helpers";
import { places } from "./fixtures/planting";

// Map behaviour uses the invented planting fixture and explicit database-shaped pins.
const fixturePins: Record<string, [number, number]> = {
  "whitechapel-north": [-44.9736, 168.8546], "9A": [-44.9949, 168.8019],
  "9G": [-44.9907, 168.8082], "5B": [-45.014, 168.6666], "11": [-44.9716, 168.7985],
};
const areas: PlantingAreaPin[] = places.flatMap((site) => site.parcels.map((parcel) => ({
  slug: `${site.slug}-${parcel.id}`, site: site.slug, name: parcel.name, description: "", wrt_number: parcel.id,
  lat: fixturePins[parcel.id]?.[0] ?? null, lng: fixturePins[parcel.id]?.[1] ?? null,
  pin_source_url: null, pin_checked_on: null,
})));
const locationsForSites = (sites: readonly { slug: string; name: string }[], records: readonly PlantingRecord[]) =>
  mapLocationsForSites(areas, sites, records);

describe("public site reference locations", () => {
  it("groups overlapping points without hiding isolated locations or losing chain neighbours", () => {
    expect(groupNearbyLocations([{ x: 0, y: 0 }, { x: 45, y: 0 }, { x: 90, y: 0 }, { x: 300, y: 100 }]))
      .toEqual([[0, 1, 2], [3]]);
    expect(groupNearbyLocations([{ x: 0, y: 0 }, { x: 90, y: 0 }])).toEqual([[0], [1]]);
    expect(groupNearbyLocations([])).toEqual([]);
  });
  it("uses database values and handles unnumbered areas, missing pins and optional metadata", async () => {
    const records = await repo.listRecords();
    const record = records.find((r) => r.placeSlug === "whitechapel")!;
    const area = areas.find((a) => a.site === "whitechapel")!;
    const updated = { ...area, slug: "new-bank", name: "Updated bank", wrt_number: null, lat: -45, lng: 169,
      description: "", pin_source_url: null, pin_checked_on: null };
    const sites = [{ slug: area.site, name: "Whitechapel" }];
    const mapped = mapLocationsForSites([updated], sites, [{ ...record, parcelId: updated.slug }]);
    expect(mapped[0]).toMatchObject({ id: "new-bank", label: "Updated bank", latitude: -45, longitude: 169,
      description: "", sourceUrl: null, checkedOn: null, countScope: "site", split: { total: record.quantity } });
    expect(mapLocationsForSites([{ ...updated, lat: null }], sites, records)).toEqual([]);
    expect(mapLocationsForSites([{ ...updated, lng: null }], sites, records)).toEqual([]);
    expect(mapLocationsForSites([], sites, records)).toEqual([]);
    expect(mapLocationsForSites([area, { ...updated, lat: null }], sites, records)[0]?.countScope).toBe("part");
  });

  it("derives regional bounds from all database pins", () => {
    const bounds = locationBounds(locationsForSites(places, []))!;
    expect(regionMapOptions(areas)).toEqual({ bounds,
      maxBounds: [[bounds[0][0] - 0.35, bounds[0][1] - 0.12], [bounds[1][0] + 0.35, bounds[1][1] + 0.12]],
      fitBoundsOptions: { padding: 24 }, cooperativeGestures: true });
    expect(regionMapOptions([{ lat: -45, lng: 169 }]).bounds).toEqual([[169, -45], [169, -45]]);
    expect(regionMapOptions([])).not.toHaveProperty("bounds");
  });

  it("maps visible sites with pins", async () => {
    const sites = await q.places();
    const records = await repo.listRecords();
    const mapped = locationsForSites(sites.map((site) => site.item), records);
    const slugs = new Set(mapped.map((location) => location.siteSlug));
    expect(slugs.size).toBe(4);
    expect([...slugs].every((slug) => sites.some((site) => site.item.slug === slug))).toBe(true);
    expect(mapped).toHaveLength(5);
    expect(new Set(mapped.map((location) => location.id)).size).toBe(mapped.length);
    expect(locationsForSites([{ slug: "paper4trees", name: "Paper4Trees" }], records)).toEqual([]);
    for (const location of mapped) {
      const site = sites.find((site) => site.item.slug === location.siteSlug)!;
      expect(site).toBeDefined();
    }
  });

  it("keeps seeded pins in the wider Whakatipu area with source provenance", () => {
    for (const area of areaSeed.filter((row) => row.lat !== null && row.lng !== null)) {
      expect(area.lat).toBeGreaterThan(-45.6);
      expect(area.lat).toBeLessThan(-44.6);
      expect(area.lng).toBeGreaterThan(168.1);
      expect(area.lng).toBeLessThan(169);
      expect(new URL(area.pin_source_url!).protocol).toBe("https:");
      expect(area.pin_checked_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("preserves the organizer's historic anchor points and coordinate axis order", () => {
    const whitechapel = { latitude: areaSeed.find((p) => p.slug === "whitechapel-reserve")!.lat!, longitude: areaSeed.find((p) => p.slug === "whitechapel-reserve")!.lng! };
    const slopeHill = { latitude: areaSeed.find((p) => p.slug === "slope-hill-road")!.lat!, longitude: areaSeed.find((p) => p.slug === "slope-hill-road")!.lng! };
    expect([whitechapel.latitude, whitechapel.longitude]).toEqual([-44.9736, 168.8546]);
    expect([slopeHill.latitude, slopeHill.longitude]).toEqual([-44.9716, 168.7985]);
    expect(locationBounds([whitechapel, slopeHill])).toEqual([[168.7985, -44.9736], [168.8546, -44.9716]]);
    expect(new URL(locationMapUrl(whitechapel)).searchParams.get("query")).toBe("-44.9736,168.8546");
    expect(locationBounds([])).toBeNull();
  });

  it("keeps dispersed locations distinct and respects the visible site filter", () => {
    const area = areas.find((a) => a.site === "gorge-road-area" && a.lat !== null)!;
    const gorge = mapLocationsForSites([
      ...areas, { ...area, slug: "far-bank", lat: -45, lng: 169 },
    ], [{ slug: "gorge-road-area", name: "Gorge Road area" }], []);
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
    for (const point of all) {
      const area = areas.find((candidate) => candidate.slug === point.id)!;
      const matching = records.filter((record) => record.placeSlug === point.siteSlug && record.parcelId === (area.wrt_number ?? area.slug));
      expect(point.split).toEqual(splitOf(matching));
      expect(point.countScope).toBe(areas.filter((candidate) => candidate.site === point.siteSlug).length === 1 ? "site" : "part");
      const confirmedPoint = confirmed.find((candidate) => candidate.id === point.id)!;
      expect(confirmedPoint.split).toEqual(splitOf(matching.filter((record) => !record.needsReview)));
    }
    for (const point of all) expect(point.split.total).toBe(point.split.resolved + point.split.needsReview);
    expect(compactPlantCount(1200)).toBe("1.2k");
    expect(compactPlantCount(27200)).toBe("27.2k");
    expect(compactPlantCount(74)).toBe("74");
  });
});
