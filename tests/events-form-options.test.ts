import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ lookups: vi.fn(), species: vi.fn() }));
vi.mock("@/lib/wrt/server", () => ({
  getWrtAll: () => ({ lookups: mocks.lookups }),
  getRepository: () => ({ listSpecies: mocks.species }),
}));

import { eventFormOptions } from "@/lib/wrt/events/form-options";
import { validateEventInput } from "@/lib/wrt/events/validate";
import { repo } from "./helpers";

describe("new planting species options", () => {
  it("includes unused active species, omits deactivated ones and leaves history lookups intact", async () => {
    const all = await repo.listSpecies();
    const history = await repo.listRecords();
    const used = new Set(history.map((r) => r.speciesId));
    const unused = all.find((s) => !used.has(s.id))!;
    const deactivated = all.find((s) => used.has(s.id))!;
    const lookups = { places: await repo.listPlaces(), species: [deactivated] };
    mocks.lookups.mockResolvedValue(lookups);
    mocks.species.mockResolvedValue(all.map((s) => ({ ...s, deactivatedAt: s.id === deactivated.id ? "2026-11-09T00:00:00Z" : null })));
    const options = await eventFormOptions();
    expect(options.species.some((s) => s.id === unused.id)).toBe(true);
    expect(options.species.some((s) => s.id === deactivated.id)).toBe(false);
    expect(lookups.species).toEqual([deactivated]);

    const result = validateEventInput({
      placeSlug: options.sites[0].slug, parcelId: null, plantedOn: "2026-11-09", season: "Spring",
      seasonYear: 2026, polygon: null, notes: null, species: [{ speciesId: deactivated.id, quantity: 12 }],
    }, { places: lookups.places, species: options.species }, "2026-11-09");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveProperty("species.0.speciesId");
  });
});
