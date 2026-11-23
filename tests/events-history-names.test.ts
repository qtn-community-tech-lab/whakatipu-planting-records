import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
const mocks = vi.hoisted(() => ({ lines: vi.fn(), species: vi.fn(), siteSpecies: vi.fn() }));
vi.mock("@/db/queries/plantings", () => ({
  listSiteSeasonPlantingLines: mocks.lines,
  listPlantingEventNotes: async () => [],
}));
vi.mock("@/db/queries/species", () => ({ listSpecies: mocks.species }));
vi.mock("@/db/queries/sites", () => ({
  listSiteSpecies: mocks.siteSpecies,
  listSiteSeasons: async () => [],
  listPlantingAreaSeasons: async () => [],
}));
import { loadSeasonPlantingEvents, loadSiteOverview } from "@/app/events/new/actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.species.mockResolvedValue([]);
});

it("shows scientific names alongside Māori and common names in past planting events, preserving identities and quantities", async () => {
  mocks.lines.mockResolvedValue([
    { line_id: 11, planting_id: 7, species: "sophora-microphylla", register_code: "SP-1", scientific_name: "Sophora microphylla", common_name: "Small-leaved kōwhai", maori_name: "Kōwhai", quantity: 120 },
    { line_id: 12, planting_id: 7, species: "species-only", register_code: null, scientific_name: "Scientific only", common_name: null, maori_name: null, quantity: 30 },
  ]);
  const result = await loadSeasonPlantingEvents("lake-hayes", "spring-2026", null);
  expect(result?.events[0]?.lines).toMatchObject([
    { id: "11", species: "SP-1", name: "Sophora microphylla", italic: true, second: "Kōwhai · Small-leaved kōwhai", secondItalic: false, quantity: 120 },
    { id: "12", species: "species-only", name: "Scientific only", italic: true, second: null, quantity: 30 },
  ]);
});

it("includes scientific names in the site's planting overview without duplicating other names", async () => {
  mocks.siteSpecies.mockResolvedValue([
    { species: "sophora-microphylla", scientific_name: "Sophora microphylla", common_name: "Kōwhai", maori_name: "Kōwhai", plants: 150 },
  ]);
  expect((await loadSiteOverview("lake-hayes", null))?.trees).toEqual([
    { id: "sophora-microphylla", name: "Sophora microphylla", italic: true, second: "Kōwhai", here: 150, photo: null },
  ]);
});
