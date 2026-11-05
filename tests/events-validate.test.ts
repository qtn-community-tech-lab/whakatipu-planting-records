import { beforeAll, describe, expect, it } from "vitest";
import { validateEventInput, type EventLookups } from "@/lib/wrt/events/validate";
import { polygonAreaM2, ringSelfIntersects } from "@/lib/wrt/events/geo";
import { q } from "./helpers";
import { sampleInput } from "./event-store-contract";

const TODAY = "2026-11-01";
let lookups: EventLookups;
let site: { slug: string; parcels: { id: string }[] };
let otherParcel: string;
let speciesA: string;
let speciesB: string;

beforeAll(async () => {
  const l = await q.lookups();
  lookups = l;
  const sites = l.places.filter((p) => !p.isScheme && p.parcels.length > 1);
  site = sites[0];
  otherParcel = sites[1].parcels[0].id;
  [speciesA, speciesB] = l.species.map((s) => s.id);
});

const valid = (over: Record<string, unknown> = {}) =>
  ({ ...sampleInput({ placeSlug: site.slug, species: [{ speciesId: speciesA, quantity: 40 }] }), ...over });

describe("validateEventInput", () => {
  it("accepts a well-formed event (with or without a parcel)", () => {
    expect(validateEventInput(valid(), lookups, TODAY).ok).toBe(true);
    expect(validateEventInput(valid({ parcelId: site.parcels[0].id }), lookups, TODAY).ok).toBe(true);
  });

  it("trims notes and turns blank notes into null", () => {
    const r = validateEventInput(valid({ notes: "   " }), lookups, TODAY);
    expect(r.ok && r.value.notes).toBeNull();
  });

  const cases: [string, Record<string, unknown>, string][] = [
    ["unknown site", { placeSlug: "nowhere" }, "placeSlug"],
    ["malformed slug", { placeSlug: "Not A Slug!" }, "placeSlug"],
    ["parcel from another site", { parcelId: "__other__" }, "parcelId"],
    ["future date", { plantedOn: "2026-11-02" }, "plantedOn"],
    ["impossible date", { plantedOn: "2026-02-30" }, "plantedOn"],
    ["bad season", { season: "Monsoon" }, "season"],
    ["no species", { species: [] }, "species"],
    ["zero quantity", { species: [{ speciesId: "__a__", quantity: 0 }] }, "species.0.quantity"],
    ["fractional quantity", { species: [{ speciesId: "__a__", quantity: 2.5 }] }, "species.0.quantity"],
    ["unknown species", { species: [{ speciesId: "SP-NOPE", quantity: 3 }] }, "species.0.speciesId"],
    ["duplicate species", { species: [{ speciesId: "__a__", quantity: 3 }, { speciesId: "__a__", quantity: 4 }] }, "species.1.speciesId"],
    ["missing polygon", { polygon: null }, "polygon"],
    ["too few corners", { polygon: { type: "Polygon", coordinates: [[[168.8, -44.98], [168.81, -44.98], [168.8, -44.98]]] } }, "polygon"],
    ["open ring", { polygon: { type: "Polygon", coordinates: [[[168.8, -44.98], [168.81, -44.98], [168.81, -44.99], [168.8, -44.99]]] } }, "polygon"],
    ["bow tie", { polygon: { type: "Polygon", coordinates: [[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]] } }, "polygon"],
    ["polygon with a hole", { polygon: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]], [[0, 0], [1, 0], [1, 1], [0, 0]]] } }, "polygon.coordinates"],
    ["out-of-range coordinate", { polygon: { type: "Polygon", coordinates: [[[200, 0], [1, 0], [1, 1], [200, 0]]] } }, "polygon.coordinates.0.0.0"],
  ];

  it.each(cases)("rejects %s", (_name, over, field) => {
    const sub = (v: unknown): unknown =>
      v === "__other__" ? otherParcel : v === "__a__" ? speciesA : Array.isArray(v) ? v.map(sub)
        : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sub(x)])) : v;
    const r = validateEventInput(valid(sub(over) as Record<string, unknown>), lookups, TODAY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors)).toContain(field);
  });

  it("rejects an order scheme as the site", () => {
    const scheme = lookups.places.find((p) => p.isScheme);
    if (!scheme) return;
    const r = validateEventInput(valid({ placeSlug: scheme.slug }), lookups, TODAY);
    expect(!r.ok && r.errors.placeSlug).toBeTruthy();
  });

  it("allows different species on one event", () => {
    const r = validateEventInput(valid({ species: [{ speciesId: speciesA, quantity: 1 }, { speciesId: speciesB, quantity: 2 }] }), lookups, TODAY);
    expect(r.ok).toBe(true);
  });
});

describe("geo", () => {
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
