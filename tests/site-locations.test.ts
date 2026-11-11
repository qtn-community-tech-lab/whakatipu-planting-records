import { describe, expect, it } from "vitest";
import { compactPlantCount, groupNearbyLocations, locationBounds, locationMapUrl, locationsForSites as mapLocationsForSites, type PlantingAreaPin } from "@/lib/wrt/site-locations";
import siteLocations from "@/data/site-locations.json";
import { regionMapOptions } from "@/lib/wrt/map-region";
import type { PlantingRecord } from "@/lib/wrt/types";
import { q, repo, workbook } from "./helpers";

// Offline database-shaped areas; reference JSON is only an import/test fixture.
const areas: PlantingAreaPin[] = workbook.places.flatMap((site) => site.parcels.map((parcel) => {
  const pin = siteLocations.find((p) => p.siteSlug === site.slug &&
    (p.parcelIds?.includes(parcel.id) ?? site.parcels.length === 1));
  return {
    slug: pin?.id ?? `${site.slug}-${parcel.id}`, site: site.slug, name: pin?.label ?? parcel.name,
    description: pin?.description ?? "", wrt_number: parcel.id,
    lat: pin?.latitude ?? null, lng: pin?.longitude ?? null,
    pin_source_url: pin?.coordinateSourceUrl ?? null, pin_checked_on: pin?.checkedOn ?? null,
  };
}));
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
    const bounds = locationBounds(locationsForSites(workbook.places, []))!;
    expect(regionMapOptions(areas)).toEqual({ bounds,
      maxBounds: [[bounds[0][0] - 0.35, bounds[0][1] - 0.12], [bounds[1][0] + 0.35, bounds[1][1] + 0.12]],
      fitBoundsOptions: { padding: 24 }, cooperativeGestures: true });
    expect(regionMapOptions([{ lat: -45, lng: 169 }]).bounds).toEqual([[169, -45], [169, -45]]);
    expect(regionMapOptions([])).not.toHaveProperty("bounds");
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

  it("keeps every point in the wider Whakatipu area with public source provenance", () => {
    for (const location of siteLocations) {
      expect(location.latitude, location.label).toBeGreaterThan(-45.6);
      expect(location.latitude, location.label).toBeLessThan(-44.6);
      expect(location.longitude, location.label).toBeGreaterThan(168.1);
      expect(location.longitude, location.label).toBeLessThan(169);
      expect(["historic-event", "landmark"]).toContain(location.precision);
      expect(new URL(location.sourceUrl).protocol).toBe("https:");
      expect(new URL(location.coordinateSourceUrl).protocol).toBe("https:");
      expect(location.description.length).toBeGreaterThan(30);
      expect(location.coordinateMethod?.length, location.label).toBeGreaterThan(30);
      expect(location.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("uses disjoint parcel counts for every site with several reference points", () => {
    const slugs = new Set(siteLocations.map((location) => location.siteSlug));
    for (const slug of slugs) {
      const points = siteLocations.filter((location) => location.siteSlug === slug);
      if (points.length < 2) continue;
      const ids = points.flatMap((point) => {
        expect(point.parcelIds?.length, point.label).toBeGreaterThan(0);
        return point.parcelIds ?? [];
      });
      expect(new Set(ids).size, slug).toBe(ids.length);
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
    const partCounts = {
      "slope-hill-riparian": 13478,
      "bush-creek-event": 5312,
      "feehly-cemetery": 4965,
      "peace-park": 4149,
      "morning-star-reserve": 3869,
      "shotover-wetland": 3846,
      "jardine-park-nursery": 1109,
      "jardine-welcome-forest": 6995,
      "shotover-primary-internal-school": 700,
    };
    for (const [id, total] of Object.entries(partCounts)) {
      const point = all.find((p) => p.id === id)!;
      expect(point.countScope, id).toBe("part");
      expect(point.split.total, id).toBe(total);
    }
    // Derby's allocation needs review: hiding it must remove its marker quantity.
    expect(all.find((p) => p.id === "derby-street-reserve")!.split.total).toBe(73);
    expect(confirmed.find((p) => p.id === "derby-street-reserve")!.split.total).toBe(0);
    expect(all.filter((p) => p.siteSlug === "gorge-road-area").reduce((sum, p) => sum + p.split.total, 0)).toBe(4457);
    for (const point of all) expect(point.split.total).toBe(point.split.resolved + point.split.needsReview);
    expect(compactPlantCount(1200)).toBe("1.2k");
    expect(compactPlantCount(26273)).toBe("26.3k");
    expect(compactPlantCount(74)).toBe("74");
  });
});
