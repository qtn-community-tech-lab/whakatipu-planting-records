import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ lookups: vi.fn(), species: vi.fn(), sites: vi.fn() }));
vi.mock("@/lib/wrt/server", () => ({
  getWrt: () => ({ lookups: mocks.lookups }),
}));
vi.mock("@/db/queries/species", () => ({ listSpeciesForPlanting: mocks.species }));

vi.mock("@/db/queries/sites", () => ({ listSites: mocks.sites }));

import { eventFormOptions } from "@/lib/wrt/events/form-options";
import { validateEventInput } from "@/lib/wrt/events/validate";
import { rankMatches } from "@/lib/wrt/text";
import { repo } from "./helpers";

beforeEach(async () => {
  mocks.sites.mockResolvedValue([
    ...(await repo.listPlaces()).map((p) => ({ slug: p.slug, name: p.name })),
    { slug: "empty", name: "Empty site" },
    { slug: "new", name: "New site" },
  ]);
});

describe("new planting species options", () => {
  it("omits deactivated sites while preserving historical lookups", async () => {
    const places = await repo.listPlaces();
    const deactivated = places[0]!;
    mocks.lookups.mockResolvedValue({ places });
    mocks.species.mockResolvedValue([]);
    mocks.sites.mockResolvedValue(places.filter((p) => p.slug !== deactivated.slug)
      .map((p) => ({ slug: p.slug, name: p.name })));
    const options = await eventFormOptions();
    expect(options.sites.some((p) => p.slug === deactivated.slug)).toBe(false);
    expect(places).toContain(deactivated);
    const result = validateEventInput({
      siteSlug: deactivated.slug, partId: null, plantedOn: "2026-11-09", season: "Spring",
      seasonYear: 2026, polygon: null, notes: null, species: [{ speciesId: "test", quantity: 12 }],
    }, { places: options.sites.map((p) => ({ ...p, parcels: p.parts })), species: [{ id: "test" }] }, "2026-11-09");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveProperty("siteSlug");
  });
  it("includes all active sites and areas, including those without history", async () => {
    mocks.lookups.mockResolvedValue({ places: [
      { slug: "empty", name: "Empty site", searchKeys: ["empty site"], parcels: [] },
      { slug: "new", name: "New site", searchKeys: ["new site", "riverbank"],
        parcels: [
          { id: "new-area", name: "Riverbank" },
          { id: "retired-area", name: "Retired area", deactivatedAt: "2026-11-09" },
        ] },
      { slug: "retired", name: "Retired site", deactivatedAt: "2026-11-09", searchKeys: [], parcels: [] },
      { slug: "scheme", name: "Order scheme", searchKeys: [], parcels: [] },
    ] });
    mocks.sites.mockResolvedValue([{ slug: "empty" }, { slug: "new" }, { slug: "scheme" }]);
    mocks.species.mockResolvedValue([]);
    expect((await eventFormOptions()).sites).toEqual([
      { slug: "empty", name: "Empty site", keys: ["empty site"], parts: [] },
      { slug: "new", name: "New site", keys: ["new site", "riverbank"],
        parts: [{ id: "new-area", name: "Riverbank", keys: ["riverbank"] }] },
      { slug: "scheme", name: "Order scheme", keys: [], parts: [] },
    ]);
  });

  it("includes unused active species, omits deactivated ones and leaves history lookups intact", async () => {
    const all = await repo.listSpecies();
    const history = await repo.listRecords();
    const used = new Set(history.map((r) => r.speciesId));
    const unused = all.find((s) => !used.has(s.id))!;
    const deactivated = all.find((s) => used.has(s.id))!;
    const lookups = { places: await repo.listPlaces(), species: [deactivated] };
    mocks.lookups.mockResolvedValue(lookups);
    mocks.species.mockResolvedValue(all.filter((s) => s.id !== deactivated.id).map((s) => ({
      slug: s.slug, register_code: s.id, scientific_name: s.scientificName,
      suggested_spelling: s.suggestedSpelling, common_name: s.commonName, maori_name: s.maoriName,
    })));
    const options = await eventFormOptions();
    expect(options.species.some((s) => s.id === unused.id)).toBe(true);
    expect(options.species.some((s) => s.id === deactivated.id)).toBe(false);
    expect(lookups.species).toEqual([deactivated]);

    const result = validateEventInput({
      siteSlug: options.sites[0]!.slug, partId: null, plantedOn: "2026-11-09", season: "Spring",
      seasonYear: 2026, polygon: null, notes: null, species: [{ speciesId: deactivated.id, quantity: 12 }],
    }, { places: lookups.places, species: options.species }, "2026-11-09");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveProperty("species.0.speciesId");
  });

  it("preserves register identifiers, falls back to slugs and searches normalized names", async () => {
    mocks.lookups.mockResolvedValue({ places: [] });
    mocks.species.mockResolvedValue([
      { slug: "kowhai", register_code: "SP-1", scientific_name: "Sophora microphylla", suggested_spelling: "Sophora", common_name: "Yellow kowhai", maori_name: "Kōwhai" },
      { slug: "new-species", register_code: null, scientific_name: "New species", suggested_spelling: null, common_name: null, maori_name: null },
      { slug: "common", register_code: null, scientific_name: "Common scientific", suggested_spelling: null, common_name: "Common name", maori_name: null },
    ]);
    const { species } = await eventFormOptions();
    expect(species.map((s) => s.scientific)).toEqual(["Common scientific", "New species", "Sophora microphylla"]);
    expect(species[2]).toEqual({ id: "SP-1", name: "Kōwhai", scientific: "Sophora microphylla", isScientific: false, keys: ["sophora microphylla", "sophora", "yellow kowhai", "kowhai"] });
    expect(species[1]).toMatchObject({ id: "new-species", isScientific: true });
    for (const query of ["Sophora microphylla", "microphylla", "Sophora", "Yellow kowhai", "Kōwhai", "kowhai"]) {
      expect(rankMatches(species, query)[0]?.id, query).toBe("SP-1");
    }
  });
});
