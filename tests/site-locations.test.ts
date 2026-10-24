import { describe, expect, it } from "vitest";
import { compactPlantCount, groupNearbyLocations, locationBounds, locationMapUrl, locationsForSites } from "@/lib/wrt/site-locations";
import { fixture, pin, record } from "./explorer-fixture";

describe("saved map locations", () => {
  it("groups overlapping markers and preserves coordinate axis order", () => {
    expect(groupNearbyLocations([{ x: 0, y: 0 }, { x: 45, y: 0 }, { x: 90, y: 0 }, { x: 300, y: 100 }])).toEqual([[0, 1, 2], [3]]);
    expect(locationBounds([pin])).toEqual([[168.8, -45], [168.8, -45]]);
    expect(locationBounds([])).toBeNull();
    expect(new URL(locationMapUrl(pin)).searchParams.get("query")).toBe("-45,168.8");
    expect(compactPlantCount(1200)).toBe("1.2k");
  });
  it("uses the site's pin for an area without a pin, including zero-history sites", () => {
    const data = fixture();
    expect(locationsForSites(data.places, [])).toHaveLength(1);
    expect(locationsForSites(data.places, [record()])[0].split.total).toBe(10);
    expect(locationsForSites([], [])).toEqual([]);
    data.places[0].location = null;
    expect(locationsForSites(data.places, [])).toEqual([]);
  });
  it("counts distinct area pins without duplicating site-level or area quantities", () => {
    const data = fixture();
    data.places[0].parcels[0].location = { ...pin, id: "area-pin", longitude: 168.9 };
    const locations = locationsForSites(data.places, [record(), record({ id: "site", parcelId: null, quantity: 3 })]);
    expect(locations).toHaveLength(2);
    expect(locations.map((p) => p.split.total).sort((a, b) => a - b)).toEqual([3, 10]);
    expect(locations.reduce((sum, p) => sum + p.split.total, 0)).toBe(13);
  });
});
