import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ lookups: vi.fn(), species: vi.fn(), sites: vi.fn() }));
vi.mock("@/lib/wrt/server", () => ({
  getWrtAll: () => ({ lookups: mocks.lookups }),
}));
vi.mock("@/db/queries/species", () => ({ listSpeciesForPlanting: mocks.species }));

vi.mock("@/db/queries/sites", () => ({ listSites: mocks.sites }));

import { eventFormOptions } from "@/lib/wrt/events/form-options";
import { validateEventInput } from "@/lib/wrt/events/validate";
import { repo } from "./helpers";

beforeEach(async () => {
  mocks.sites.mockResolvedValue([
    ...(await repo.listPlaces()).map((p) => ({ slug: p.slug, name: p.name, is_scheme: p.isScheme })),
    { slug: "empty", name: "Empty site", is_scheme: false },
    { slug: "new", name: "New site", is_scheme: false },
  ]);
});

describe("new planting species options", () => {
  it("omits deactivated sites while preserving historical lookups", async () => {
    const places = await repo.listPlaces();
    const deactivated = places.find((p) => !p.isScheme)!;
    mocks.lookups.mockResolvedValue({ places });
    mocks.species.mockResolvedValue([]);
    mocks.sites.mockResolvedValue(places.filter((p) => p.slug !== deactivated.slug)
      .map((p) => ({ slug: p.slug, name: p.name, is_scheme: p.isScheme })));
    const options = await eventFormOptions();
    expect(options.sites.some((p) => p.slug === deactivated.slug)).toBe(false);
    expect(places).toContain(deactivated);
    const result = validateEventInput({
      placeSlug: deactivated.slug, parcelId: null, plantedOn: "2026-11-09", season: "Spring",
      seasonYear: 2026, polygon: null, notes: null, species: [{ speciesId: "test", quantity: 12 }],
    }, { places: options.sites.map((p) => ({ ...p, isScheme: false, parcels: p.parts })), species: [{ id: "test" }] }, "2026-11-09");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveProperty("placeSlug");
  });
  it("includes sites and areas without history while excluding order schemes", async () => {
    mocks.lookups.mockResolvedValue({ places: [
      { slug: "empty", name: "Empty site", isScheme: false, searchKeys: ["empty site"], parcels: [] },
      { slug: "new", name: "New site", isScheme: false, searchKeys: ["new site", "riverbank"],
        parcels: [{ id: "new-area", name: "Riverbank" }] },
      { slug: "scheme", name: "Order scheme", isScheme: true, searchKeys: [], parcels: [] },
    ] });
    mocks.species.mockResolvedValue([]);
    expect((await eventFormOptions()).sites).toEqual([
      { slug: "empty", name: "Empty site", keys: ["empty site"], parts: [] },
      { slug: "new", name: "New site", keys: ["new site", "riverbank"],
        parts: [{ id: "new-area", name: "Riverbank", keys: ["riverbank"] }] },
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
      placeSlug: options.sites[0]!.slug, parcelId: null, plantedOn: "2026-11-09", season: "Spring",
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
    expect(species.map((s) => s.name)).toEqual(["Common name", "Kōwhai", "New species"]);
    expect(species[1]).toEqual({ id: "SP-1", name: "Kōwhai", scientific: "Sophora microphylla", isScientific: false, keys: ["sophora microphylla", "sophora", "yellow kowhai", "kowhai"] });
    expect(species[2]).toMatchObject({ id: "new-species", isScientific: true });
  });
});
