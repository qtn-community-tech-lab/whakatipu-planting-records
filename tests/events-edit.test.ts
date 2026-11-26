import { beforeEach, describe, expect, it, vi } from "vitest";
import { plantingEventEditSchema } from "@/db/types";
import { INPUT_LIMITS } from "@/lib/forms/limits";
import { editFormSchema, editValues } from "@/components/wrt/create-planting-event/seasons/edit-planting-event";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ access: vi.fn(), update: vi.fn(), stored: vi.fn(), lines: vi.fn(), species: vi.fn(), tag: vi.fn(), revalidate: vi.fn(), redirect: vi.fn() }));
vi.mock("@/db/queries/auth", () => ({ requireAuthenticated: mocks.access }));
vi.mock("@/db/queries/plantings", () => ({ updatePlantingEvent: mocks.update, readPlantingEventSeason: mocks.stored, listPlantingEventLines: mocks.lines }));
vi.mock("@/db/queries/species", () => ({ listSpeciesForPlanting: mocks.species }));
vi.mock("next/cache", () => ({ updateTag: mocks.tag, revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { savePlantingEventEdit } from "@/app/events/new/actions";

const values = {
  site: "lake-hayes", area: null, plantedOn: null, type: null, notes: "Corrected",
  lines: [{ id: 11, species: "SP-1", quantity: 20 }],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.stored.mockResolvedValue({ season: "autumn-2021", plantedOn: null });
  mocks.lines.mockResolvedValue([{ id: 11, species: "historical-species", quantity: 10 }]);
  mocks.species.mockResolvedValue([{ slug: "new-species", register_code: "SP-2" }]);
  mocks.update.mockResolvedValue({ data: { id: 7 }, error: null });
  mocks.redirect.mockImplementation(() => { throw new Error("REDIRECT"); });
});

describe("event correction validation", () => {
  it("preserves unknown date, type and area without inventing values", () => {
    const form = editFormSchema("autumn-2021", "2026-11-23", "");
    const input = form.parse({ ...values, area: "", type: "unknown", plantedOn: "", lines: [{ id: 11, species: "SP-1", quantity: "20" }] });
    expect(editValues(input)).toEqual(values);
    expect(plantingEventEditSchema.safeParse(values).success).toBe(true);
  });

  it.each([0, -1, 1.5, 100001, null, "20", Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid quantity %s", (quantity) => {
    expect(plantingEventEditSchema.safeParse({ ...values, lines: [{ ...values.lines[0], quantity }] }).success).toBe(false);
  });

  it.each(["0", "-1", "1.5", "1e2", "0x10", "100001", "", "abc"])("rejects invalid typed quantity %s without changing its meaning", (quantity) => {
    const form = editFormSchema("autumn-2021", "2026-11-23", "");
    expect(form.safeParse({ ...values, area: "", type: "unknown", plantedOn: "", lines: [{ id: 11, species: "SP-1", quantity }] }).success).toBe(false);
  });

  it("rejects duplicate species, empty lines, invalid dates and types", () => {
    for (const change of [
      { lines: [values.lines[0], { ...values.lines[0], id: null }] }, { lines: [] },
      { plantedOn: "2021-02-30" }, { type: "unknown" },
    ]) expect(plantingEventEditSchema.safeParse({ ...values, ...change }).success).toBe(false);
  });

  it.each([
    ["site", INPUT_LIMITS.identifier, "s"], ["area", INPUT_LIMITS.identifier, "a"],
    ["notes", INPUT_LIMITS.longText, "n"],
  ] as const)("enforces the %s limit on server and client", (field, limit, prefix) => {
    const atLimit = prefix + "x".repeat(limit - prefix.length);
    const form = editFormSchema("autumn-2021", "2026-11-23", "");
    const client = { ...values, area: "", plantedOn: "", type: "unknown", lines: [{ id: 11, species: "SP-1", quantity: "20" }] };
    for (const [schema, input] of [[plantingEventEditSchema, values], [form, client]] as const) {
      expect(schema.safeParse({ ...input, [field]: atLimit }).success).toBe(true);
      expect(schema.safeParse({ ...input, [field]: `${atLimit}x` }).success).toBe(false);
    }
  });
});

describe("save event correction", () => {
  it("checks staff access before reading or writing", async () => {
    mocks.access.mockRejectedValue(new Error("LOGIN"));
    await expect(savePlantingEventEdit(7, values)).rejects.toThrow("LOGIN");
    expect(mocks.stored).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("validates untrusted values and line ownership before any write", async () => {
    expect(await savePlantingEventEdit(7, { ...values, notes: "x".repeat(INPUT_LIMITS.longText + 1) })).toHaveProperty("issues");
    expect(await savePlantingEventEdit(-1, values)).toHaveProperty("error");
    expect(await savePlantingEventEdit(7, { ...values, lines: [{ id: 12, species: "SP-1", quantity: 20 }] })).toHaveProperty("error");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("saves once using the existing event and historical line identity, strips metadata and redirects to the saved event", async () => {
    await expect(savePlantingEventEdit(7, { ...values, source: "app", updated_by: "spoofed" })).rejects.toThrow("REDIRECT");
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith(7, { ...values, lines: [{ id: 11, species: "historical-species", quantity: 20 }] });
    expect(mocks.tag).toHaveBeenCalledOnce();
    expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
    expect(mocks.redirect).toHaveBeenCalledWith("/events?event=7&saved=1");
  });

  it("rejects duplicate species after resolving register codes and slugs", async () => {
    mocks.species.mockResolvedValue([{ slug: "historical-species", register_code: "SP-2" }]);
    expect(await savePlantingEventEdit(7, { ...values, lines: [...values.lines, { id: null, species: "SP-2", quantity: 3 }] })).toHaveProperty("issues.0.path", "lines");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("preserves an unchanged historical date outside current rules but validates corrections", async () => {
    mocks.stored.mockResolvedValue({ season: "autumn-2021", plantedOn: "2021-06-01" });
    await expect(savePlantingEventEdit(7, { ...values, plantedOn: "2021-06-01" })).rejects.toThrow("REDIRECT");
    mocks.update.mockClear();
    expect(await savePlantingEventEdit(7, { ...values, plantedOn: "2021-06-02" })).toHaveProperty("issues.0.path", "plantedOn");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("maps location errors to fields and leaves failed edits retryable without a redirect", async () => {
    mocks.update.mockResolvedValue({ data: null, error: { code: "22023", details: "area", message: "Choose an area belonging to this site" } });
    expect(await savePlantingEventEdit(7, values)).toEqual({ issues: [{ path: "area", message: "Choose an area belonging to this site" }] });
    expect(mocks.tag).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("reports a transactional failure and allows the same complete input to be retried", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.update.mockResolvedValueOnce({ data: null, error: { code: "42501" } });
    expect(await savePlantingEventEdit(7, values)).toHaveProperty("error", expect.stringContaining("Your changes are still here"));
    expect(mocks.tag).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
    await expect(savePlantingEventEdit(7, values)).rejects.toThrow("REDIRECT");
    expect(mocks.update).toHaveBeenCalledTimes(2);
    vi.restoreAllMocks();
  });
});
