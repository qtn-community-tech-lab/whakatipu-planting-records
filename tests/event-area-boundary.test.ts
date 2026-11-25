import { beforeEach, describe, expect, it, vi } from "vitest";
import { boundaryFromCorners } from "@/lib/wrt/areas/geometry";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  authenticated: vi.fn(), updateBoundary: vi.fn(), updateTag: vi.fn(), revalidatePath: vi.fn(),
}));
vi.mock("@/db/queries/auth", () => ({ isAuthenticated: mocks.authenticated }));
vi.mock("@/db/queries/sites", () => ({ updatePlantingAreaBoundary: mocks.updateBoundary }));
vi.mock("next/cache", () => ({ updateTag: mocks.updateTag, revalidatePath: mocks.revalidatePath }));

import { savePlantingAreaBoundary } from "@/app/events/new/actions";

const input = {
  site: "reserve",
  area: "reserve-east",
  editing: true,
  boundary: boundaryFromCorners([[168.5, -45], [168.51, -45], [168.51, -44.99]]),
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.authenticated.mockResolvedValue(true);
  mocks.updateBoundary.mockResolvedValue({ data: { slug: input.area }, error: null });
});

describe("save a named-area boundary from the planting event map", () => {
  it("requires staff access before attempting the write", async () => {
    mocks.authenticated.mockResolvedValue(false);
    expect(await savePlantingAreaBoundary(input)).toHaveProperty("error", expect.stringContaining("staff"));
    expect(mocks.updateBoundary).not.toHaveBeenCalled();
  });

  it("validates the area identifier and boundary", async () => {
    const crossing = boundaryFromCorners([[168.5, -45], [168.51, -44.99], [168.51, -45], [168.5, -44.99]]);
    expect(await savePlantingAreaBoundary({ ...input, boundary: crossing })).toEqual({
      issues: [{ path: "boundary", message: expect.stringContaining("crosses itself") }],
    });
    expect(await savePlantingAreaBoundary({ ...input, area: "a".repeat(81) })).toHaveProperty("issues.0.path", "area");
    expect(mocks.updateBoundary).not.toHaveBeenCalled();
  });

  it.each([false, true])("rejects a Whole Site boundary write with editing=%s", async (editing) => {
    expect(await savePlantingAreaBoundary({ ...input, area: "reserve-whole-site", editing })).toHaveProperty("error", expect.stringContaining("named area"));
    expect(mocks.updateBoundary).not.toHaveBeenCalled();
  });

  it("saves only the boundary at the selected site and area, then invalidates shared maps", async () => {
    expect(await savePlantingAreaBoundary({ ...input, name: "Spoofed", updated_by: "spoofed" })).toEqual({});
    expect(mocks.updateBoundary).toHaveBeenCalledExactlyOnceWith(input.site, input.area, input.boundary, true);
    expect(mocks.updateTag).toHaveBeenCalledWith("supabase");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("returns a retryable error and leaves the maps alone until the boundary is saved", async () => {
    mocks.updateBoundary.mockResolvedValueOnce({ data: null, error: { code: "XX000" } });
    expect(await savePlantingAreaBoundary(input)).toHaveProperty("error", expect.stringContaining("Your drawing is still here"));
    expect(mocks.updateTag).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(await savePlantingAreaBoundary(input)).toEqual({});
    expect(mocks.updateBoundary).toHaveBeenCalledTimes(2);
  });
});
