import { beforeAll, describe, expect, it } from "vitest";
import { validateEventInput, type EventLookups } from "@/lib/wrt/events/validate";
import { isClosed, polygonAreaM2, ringSelfIntersects } from "@/lib/wrt/events/geo";
import { q } from "./helpers";
import { defined } from "./assertions";

const TODAY = "2026-11-01";
let lookups: EventLookups;
let site: { slug: string; parcels: { id: string }[] };
let otherPart: string;
let speciesA: string;
let speciesB: string;

beforeAll(async () => {
  const l = await q.lookups();
  lookups = l;
  const sites = l.places.filter((p) => !p.isScheme && p.parcels.length > 1);
  site = defined(sites[0]);
  otherPart = defined(defined(sites[1]).parcels[0]).id;
  speciesA = defined(l.species[0]).id;
  speciesB = defined(l.species[1]).id;
});

const valid = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  siteSlug: site.slug,
  partId: null,
  plantedOn: "2026-05-10",
  season: "Autumn",
  seasonYear: 2026,
  polygon: { type: "Polygon", coordinates: [[[168.8, -44.98], [168.81, -44.98], [168.81, -44.99], [168.8, -44.98]]] },
  species: [{ speciesId: speciesA, quantity: 40 }],
  notes: null,
  ...over,
});

describe("validateEventInput", () => {
  it("accepts a well-formed event (with or without a part)", () => {
    expect(validateEventInput(valid(), lookups, TODAY).ok).toBe(true);
    expect(validateEventInput(valid({ partId: defined(site.parcels[0]).id }), lookups, TODAY).ok).toBe(true);
  });

  it("trims notes and turns blank notes into null", () => {
    const r = validateEventInput(valid({ notes: "   " }), lookups, TODAY);
    expect(r.ok && r.value.notes).toBeNull();
  });

  it("accepts an event with no area drawn (the map comes in a later PR)", () => {
    const r = validateEventInput(valid({ polygon: null }), lookups, TODAY);
    expect(r.ok && r.value.polygon).toBeNull();
  });

  it("drops altitude from validated coordinates", () => {
    const r = validateEventInput(valid({
      polygon: { type: "Polygon", coordinates: [[[0, 0, 10], [1, 0, 20], [1, 1, 30], [0, 0, 40]]] },
    }), lookups, TODAY);
    expect(r.ok && r.value.polygon?.coordinates).toEqual([[[0, 0], [1, 0], [1, 1], [0, 0]]]);
  });

  const cases: [string, Record<string, unknown>, string][] = [
    ["unknown site", { siteSlug: "nowhere" }, "siteSlug"],
    ["malformed slug", { siteSlug: "Not A Slug!" }, "siteSlug"],
    ["part from another site", { partId: "__other__" }, "partId"],
    ["future date", { plantedOn: "2026-11-02" }, "plantedOn"],
    ["impossible date", { plantedOn: "2026-02-30" }, "plantedOn"],
    ["bad season", { season: "Monsoon" }, "season"],
    ["no species", { species: [] }, "species"],
    ["zero quantity", { species: [{ speciesId: "__a__", quantity: 0 }] }, "species.0.quantity"],
    ["fractional quantity", { species: [{ speciesId: "__a__", quantity: 2.5 }] }, "species.0.quantity"],
    ["unknown species", { species: [{ speciesId: "SP-NOPE", quantity: 3 }] }, "species.0.speciesId"],
    ["duplicate species", { species: [{ speciesId: "__a__", quantity: 3 }, { speciesId: "__a__", quantity: 4 }] }, "species.1.speciesId"],
    ["too few corners", { polygon: { type: "Polygon", coordinates: [[[168.8, -44.98], [168.81, -44.98], [168.8, -44.98]]] } }, "polygon"],
    ["open ring", { polygon: { type: "Polygon", coordinates: [[[168.8, -44.98], [168.81, -44.98], [168.81, -44.99], [168.8, -44.99]]] } }, "polygon"],
    ["bow tie", { polygon: { type: "Polygon", coordinates: [[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]] } }, "polygon"],
    ["polygon with a hole", { polygon: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]], [[0, 0], [1, 0], [1, 1], [0, 0]]] } }, "polygon.coordinates"],
    ["polygon with no rings", { polygon: { type: "Polygon", coordinates: [] } }, "polygon.coordinates"],
    ["out-of-range coordinate", { polygon: { type: "Polygon", coordinates: [[[200, 0], [1, 0], [1, 1], [200, 0]]] } }, "polygon.coordinates.0.0.0"],
  ];

  it.each(cases)("rejects %s", (_name, over, field) => {
    const sub = (v: unknown): unknown =>
      v === "__other__" ? otherPart : v === "__a__" ? speciesA : Array.isArray(v) ? v.map(sub)
        : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sub(x)])) : v;
    const r = validateEventInput(valid(sub(over) as Record<string, unknown>), lookups, TODAY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors)).toContain(field);
  });

  it("rejects an order scheme as the site", () => {
    const scheme = lookups.places.find((p) => p.isScheme);
    if (!scheme) return;
    const r = validateEventInput(valid({ siteSlug: scheme.slug }), lookups, TODAY);
    expect(!r.ok && r.errors.siteSlug).toBeTruthy();
  });

  it("allows different species on one event", () => {
    const r = validateEventInput(valid({ species: [{ speciesId: speciesA, quantity: 1 }, { speciesId: speciesB, quantity: 2 }] }), lookups, TODAY);
    expect(r.ok).toBe(true);
  });
});

describe("geo", () => {
  it("handles empty rings and rejects incomplete coordinates", () => {
    expect(isClosed([])).toBe(false);
    expect(ringSelfIntersects([])).toBe(false);
    expect(polygonAreaM2({ type: "Polygon", coordinates: [] })).toBe(0);
    expect(() => isClosed([[0], [0]])).toThrow(RangeError);
    expect(() => polygonAreaM2({ type: "Polygon", coordinates: [[[0], [1, 1]]] })).toThrow(RangeError);
  });

  it("a 100 m × 100 m square near Queenstown is about 1 ha", () => {
    // 0.001° latitude ≈ 111.2 m; at −45° 0.001° longitude ≈ 78.8 m.
    const dLat = 100 / 111_200, dLon = 100 / 78_850;
    const sq = { type: "Polygon" as const, coordinates: [[[168.66, -45.03], [168.66 + dLon, -45.03], [168.66 + dLon, -45.03 - dLat], [168.66, -45.03 - dLat], [168.66, -45.03]]] };
    expect(polygonAreaM2(sq)).toBeGreaterThan(9_900);
    expect(polygonAreaM2(sq)).toBeLessThan(10_100);
  });

  it("detects crossings but not ordinary shapes", () => {
    expect(ringSelfIntersects([[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]])).toBe(false);
    expect(ringSelfIntersects([[0, 0], [2, 0], [1, 1], [2, 2], [0, 2], [0, 0]])).toBe(false); // concave
    expect(ringSelfIntersects([[0, 0], [2, 2], [2, 0], [0, 2], [0, 0]])).toBe(true);
  });
});
