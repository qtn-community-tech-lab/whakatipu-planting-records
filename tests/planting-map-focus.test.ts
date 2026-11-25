import { expect, it } from "vitest";
import { focusPoints, type SitePin } from "@/components/wrt/create-planting-event/map/sites";
import { boundaryFromCorners } from "@/lib/wrt/areas/geometry";

const west: SitePin = { slug: "reserve", partId: "west", label: "West", at: [168.5, -45], plants: 0 };
const east: SitePin = { ...west, partId: "east", label: "East", at: [168.7, -45] };
const boundary = boundaryFromCorners([[168.70, -45], [168.71, -45], [168.71, -44.99]]);
const boundaries = [{ site: "reserve", part: "east", boundary }];

it("uses the selected area's boundary ahead of pins for other areas or the whole site", () => {
  expect(focusPoints([west, { ...west, partId: null }], boundaries, "reserve", "east")).toEqual(boundary.coordinates[0]);
});

it("keeps pin focus for a mapped part and falls back when the part has no geometry", () => {
  expect(focusPoints([west, east], boundaries, "reserve", "east")).toEqual([east.at]);
  expect(focusPoints([west], boundaries, "reserve", "unmapped")).toEqual([west.at]);
});
