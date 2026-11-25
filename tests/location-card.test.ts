import { beforeEach, describe, expect, it, vi } from "vitest";
import { Children, isValidElement } from "react";
import { LocationCard } from "@/components/wrt/sites/location-card";
import { RegionMap } from "@/components/wrt/sites/region-map";
import { EmptyState } from "@/components/wrt/shared/page";
import type { PlantingAreaPin } from "@/lib/wrt/site-locations";
import { boundaryFromCorners } from "@/lib/wrt/areas/geometry";

const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/db/queries/sites", () => ({ listPlantingAreaPins: read }));
vi.mock("@/components/wrt/sites/region-map", () => ({ RegionMap: () => null }));
// A runtime import would fail the test, including one used only for regional bounds.
vi.mock("@/data/site_areas.json", () => { throw new Error("Local reference locations must not be loaded"); });

const areas: PlantingAreaPin[] = [
  { slug: "east", site: "reserve", name: "East", description: "", wrt_number: null,
    lat: -45, lng: 168.5, pin_source_url: null, pin_checked_on: null },
  { slug: "far", site: "another-site", name: "Far", description: "", wrt_number: null,
    lat: -44.8, lng: 169, pin_source_url: "https://example.com/far", pin_checked_on: "2026-11-01" },
];
const props = { sites: [{ slug: "reserve", name: "Reserve" }], totals: [] };

beforeEach(() => { read.mockReset(); read.mockResolvedValue(areas); });

describe("location card database boundary", () => {
  it("loads all database pins, filters visible markers and keeps region-wide bounds", async () => {
    const card = await LocationCard(props);
    expect(read).toHaveBeenCalledWith();
    const map = Children.toArray(card.props.children).find((child) => isValidElement(child) && child.type === RegionMap);
    expect(map).toMatchObject({ props: {
      locations: [{ id: "east", sourceUrl: null }],
      mapOptions: { bounds: [[168.5, -45], [169, -44.8]] },
    } });
  });

  it("shows the unmapped empty state when the database has no coordinates", async () => {
    read.mockResolvedValue(areas.map((area) => ({ ...area, lat: null, lng: null })));
    const card = await LocationCard(props);
    expect(Children.toArray(card.props.children).some((child) => isValidElement(child) && child.type === EmptyState)).toBe(true);
  });

  it("renders a site's named-area boundary without a pin and filters out other sites", async () => {
    const boundary = boundaryFromCorners([[168.50, -45], [168.51, -45], [168.51, -44.99]]);
    const otherBoundary = boundaryFromCorners([[169, -45], [169.01, -45], [169.01, -44.99]]);
    read.mockResolvedValue([
      { ...areas[0], lat: null, lng: null, boundary },
      { ...areas[1], lat: null, lng: null, boundary: otherBoundary },
    ]);
    const card = await LocationCard(props);
    const map = Children.toArray(card.props.children).find((child) => isValidElement(child) && child.type === RegionMap);
    expect(map).toMatchObject({ props: {
      locations: [],
      boundaries: [boundary],
      mapOptions: { bounds: [[168.50, -45], [168.51, -44.99]] },
    } });
  });

  it("propagates database errors instead of showing an unmapped or JSON fallback", async () => {
    read.mockRejectedValue(new Error("Database unavailable"));
    await expect(LocationCard(props)).rejects.toThrow("Database unavailable");
  });
});
