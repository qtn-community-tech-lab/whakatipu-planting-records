import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { CreatePlantingEvent } from "@/components/wrt/create-planting-event/create-planting-event";
import { boundaryFromCorners } from "@/lib/wrt/areas/geometry";

vi.mock("@/app/events/new/actions", () => ({}));

const boundary = boundaryFromCorners([[168.7, -45], [168.71, -45], [168.71, -44.99]]);
const site = { slug: "reserve", name: "Reserve", keys: [], parts: [
  { id: "1A", name: "East bank", keys: [] }, { id: "west", name: "West bank", keys: [] },
] };
const east = { site: site.slug, slug: "east", name: "East bank", wrt_number: "1A", description: "",
  lat: null, lng: null, pin_source_url: null, pin_checked_on: null, boundary };

function renderForm(initialPart?: string, writable = true) {
  const html = renderToStaticMarkup(createElement(CreatePlantingEvent, {
    initialSite: site.slug, initialPart, recording: true, today: "2026-11-26", exitHref: "/records",
    options: { sites: [site], species: [] }, suggestions: {}, totals: {},
    areas: [east, { ...east, slug: "west", name: "West bank", wrt_number: null, boundary: null }],
    onSaveBoundary: writable ? async () => ({}) : undefined,
  }));
  return html.match(/<form\b[^>]*aria-label="New planting event"[^>]*>[\s\S]*?<\/form>/)![0];
}

it("offers only the boundary action for the selected area's saved geometry inside the submit form", () => {
  const existing = renderForm("1A");
  expect(existing).toContain(">Edit boundary</button>");
  expect(existing).not.toContain(">Draw boundary</button>");
  const empty = renderForm("west");
  expect(empty).toContain(">Draw boundary</button>");
  expect(empty).not.toContain(">Edit boundary</button>");
});

it.each([[undefined, true], ["1A", false]] as const)("hides boundary actions for part %s with write access %s", (part, writable) => {
  expect(renderForm(part, writable)).not.toMatch(/>(Edit|Draw) boundary<\/button>/);
});
