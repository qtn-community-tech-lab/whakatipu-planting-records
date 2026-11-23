import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  authenticated: vi.fn(), deactivate: vi.fn(), read: vi.fn(), details: vi.fn(), storedLines: vi.fn(), lines: vi.fn(),
  tag: vi.fn(), revalidate: vi.fn(), redirect: vi.fn(),
}));
vi.mock("@/db/queries/auth", () => ({ isAuthenticated: mocks.authenticated }));
vi.mock("@/db/queries/plantings", () => ({
  deactivatePlantingEvent: mocks.deactivate, readPlantingEvent: mocks.read,
  listPlantingEventLines: mocks.storedLines, listSiteSeasonPlantingLines: mocks.lines,
  listPlantingEvents: mocks.details,
  listPlantingEventLocations: async () => [],
}));
vi.mock("@/db/queries/species", () => ({ listSpecies: async () => [] }));
vi.mock("next/cache", () => ({ updateTag: mocks.tag, revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: () => { throw new Error("NOT_FOUND"); } }));

import { deactivatePlantingEventAction, loadSeasonPlantingEvents } from "@/app/events/new/actions";

const deactivatedAt = "2026-11-24T00:00:00Z";
const event = {
  id: 7, deactivated_at: deactivatedAt, updated_at: deactivatedAt, planted_on: null,
  source: "workbook", type: null, notes: "Original note", areas: { slug: "riverbank", site: "river", name: "Riverbank", wrt_number: null, sites: { name: "River Reserve" } },
  seasons: { slug: "autumn-2021", label: "Autumn 2021" },
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.authenticated.mockResolvedValue(true);
  mocks.deactivate.mockResolvedValue({ data: { id: 7 }, error: null });
  mocks.redirect.mockImplementation(() => { throw new Error("REDIRECT"); });
  mocks.lines.mockResolvedValue([{ planting_id: 7, line_id: 11, species: "kowhai", quantity: 27, area_name: "Riverbank", planted_on: null, source: "workbook" }]);
  mocks.read.mockResolvedValue(event);
  mocks.details.mockResolvedValue([{ ...event, deactivated_at: null }]);
  mocks.storedLines.mockResolvedValue([{ id: 11, quantity: 27, species: "kowhai", species_info: { register_code: null, scientific_name: "Sophora microphylla", common_name: "Kōwhai", maori_name: null } }]);
});

describe("deactivate planting event", () => {
  it("checks staff access before writing", async () => {
    mocks.authenticated.mockResolvedValue(false);
    expect(await deactivatePlantingEventAction(7)).toEqual({ error: "Sign in to deactivate planting events." });
    expect(mocks.deactivate).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid target %s", async (id) => {
    expect(await deactivatePlantingEventAction(id)).toHaveProperty("error");
    expect(mocks.deactivate).not.toHaveBeenCalled();
  });

  it("writes directly to the selected event, invalidates actual totals and opens the saved identifier", async () => {
    await expect(deactivatePlantingEventAction(7)).rejects.toThrow("REDIRECT");
    expect(mocks.deactivate).toHaveBeenCalledExactlyOnceWith(7);
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.tag).toHaveBeenCalledWith("supabase");
    expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
    expect(mocks.redirect).toHaveBeenCalledWith("/events?event=7");
  });

  it("returns retryable database and network failures without redirecting or invalidating", async () => {
    mocks.deactivate.mockResolvedValueOnce({ data: null, error: { code: "42501" } }).mockRejectedValueOnce(new Error("offline"));
    expect(await deactivatePlantingEventAction(7)).toHaveProperty("error", expect.stringContaining("Please try again"));
    expect(await deactivatePlantingEventAction(7)).toHaveProperty("error");
    expect(mocks.tag).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
    await expect(deactivatePlantingEventAction(7)).rejects.toThrow("REDIRECT");
  });

  it("binds the event target on the server and checks access again when a stale control submits", async () => {
    const result = await loadSeasonPlantingEvents("river", "autumn-2021", null);
    const deactivate = result!.events[0]!.onDeactivate!;
    mocks.authenticated.mockResolvedValue(false);
    expect(await deactivate()).toHaveProperty("error", "Sign in to deactivate planting events.");
    expect(mocks.deactivate).not.toHaveBeenCalled();
    mocks.authenticated.mockResolvedValue(true);
    await expect(deactivate()).rejects.toThrow("REDIRECT");
    expect(mocks.deactivate).toHaveBeenCalledExactlyOnceWith(7);
  });

  it("does not supply a deactivation action to public readers", async () => {
    mocks.authenticated.mockResolvedValue(false);
    const result = await loadSeasonPlantingEvents("river", "autumn-2021", null);
    expect(result!.events[0]!.onDeactivate).toBeUndefined();
  });
});

describe("reopened deactivated event", () => {
  beforeEach(() => {
    mocks.lines.mockResolvedValue([]);
    mocks.details.mockResolvedValue([event]);
  });

  it("reuses the event model for a specifically opened deactivated event, preserving its note and quantities", async () => {
    const result = await loadSeasonPlantingEvents("river", "autumn-2021", null, 7);
    expect(mocks.storedLines).toHaveBeenCalledWith(7);
    expect(result!.events[0]).toMatchObject({
      id: 7, deactivatedAt, notes: "Original note", plantedOn: null, type: null,
      lines: [{ id: "11", name: "Sophora microphylla", quantity: 27 }],
    });
    expect(result!.events[0]!.onDeactivate).toBeUndefined();
  });

  it("keeps deactivated events out of ordinary season history", async () => {
    expect((await loadSeasonPlantingEvents("river", "autumn-2021", null))!.events).toEqual([]);
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.storedLines).not.toHaveBeenCalled();
  });

  it("keeps an explicitly opened event in its own site and season", async () => {
    expect((await loadSeasonPlantingEvents("other-site", "autumn-2021", null, 7))!.events).toEqual([]);
    expect(mocks.storedLines).not.toHaveBeenCalled();
  });
});
