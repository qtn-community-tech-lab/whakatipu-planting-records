import { describe, expect, it } from "vitest";
import { eventReturn, hrefs } from "@/lib/wrt/routes";
import { validateEventInput } from "@/lib/wrt/events/validate";

const lookups = { places: [{ slug: "reserve", isScheme: false, parcels: [] }], species: [{ id: "kowhai" }] };
const input = { siteSlug: "reserve", partId: null, plantedOn: "2026-04-10", season: "Autumn", seasonYear: 2026, contextSeason: "autumn-2026", polygon: null, species: [{ speciesId: "kowhai", quantity: 20 }], notes: null };

describe("planting navigation", () => {
  it("keeps event and origin identifiers through URL encoding", () => {
    const origin = "/records?place=reserve&sort=species&page=2#results";
    const url = new URL(hrefs.events({ event: 42, returnTo: origin }), "https://example.test");
    expect(url.searchParams.get("event")).toBe("42");
    expect(url.searchParams.get("returnTo")).toBe(origin);
    expect(eventReturn(origin).href).toBe(origin);
    expect(hrefs.newEvent({ site: "reserve", season: "autumn-2026" })).toContain("/events/new?");
  });
  it.each(["https://evil.test", "//evil.test", "/events/new", "/sites\\evil", "/records\nLocation: evil", undefined])("rejects unsupported return destinations: %s", (value) => {
    expect(eventReturn(value).href).toBe("/records");
  });
});

describe("contextual planting dates", () => {
  it.each(["2026-03-01", "2026-05-31"])("accepts a real date at the season boundary: %s", (plantedOn) => {
    expect(validateEventInput({ ...input, plantedOn }, lookups, "2026-11-15").ok).toBe(true);
  });
  it.each(["2026-02-28", "2026-06-01", ""])("rejects dates outside the selected season: %s", (plantedOn) => {
    const result = validateEventInput({ ...input, plantedOn }, lookups, "2026-11-15");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.plantedOn).toBeTruthy();
  });
  it("allows an explicit departure from the original season", () => {
    expect(validateEventInput({ ...input, contextSeason: undefined, plantedOn: "2026-10-10", season: "Spring" }, lookups, "2026-11-15").ok).toBe(true);
  });
});
