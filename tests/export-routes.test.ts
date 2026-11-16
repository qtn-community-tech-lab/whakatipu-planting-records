import { strFromU8, unzipSync } from "fflate";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticated: vi.fn(),
  sites: vi.fn(), areas: vi.fn(), species: vi.fn(), events: vi.fn(), lines: vi.fn(), notes: vi.fn(), count: vi.fn(),
}));
vi.mock("@/db/queries/auth", () => ({ requireAuthenticated: mocks.requireAuthenticated }));
vi.mock("@/db/queries/export", () => ({
  exportSites: mocks.sites, exportAreas: mocks.areas, exportSpecies: mocks.species,
  exportPlantingEvents: mocks.events, exportPlantingLines: mocks.lines, exportNotes: mocks.notes,
  countExportRows: mocks.count,
}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));

import { GET as getFile } from "@/app/export/[file]/route";
import { GET as getAll } from "@/app/export/all/route";
import ExportPage from "@/app/export/page";
import { EXPORT_FILES } from "@/lib/wrt/export/files";
import { defined } from "./assertions";

const request = {} as NextRequest;
const file = (name: string) => getFile(request, { params: Promise.resolve({ file: name }) });
const queries = [mocks.sites, mocks.areas, mocks.species, mocks.events, mocks.lines, mocks.notes];

const event = { area: "lake-hayes-1", planted_on: null, type: null, deactivated_at: "2026-11-01T00:00:00Z", areas: { site: "lake-hayes" }, seasons: { label: "Autumn 2019" } };
const line = (id: number, quantity: number | null) => ({
  id, planting_event: 7, species: "kowhai", quantity, legacy_code: `PH-${id}`, source_file: "MASTER.xlsx",
  source_sheet: "MASTER", source_cell: "FK10", deactivated_at: null, species_row: { scientific_name: "Sophora microphylla" }, event,
});

describe("data export", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    for (const query of queries) query.mockResolvedValue([]);
    mocks.lines.mockResolvedValue([line(1, 0), line(2, null)]);
    mocks.species.mockResolvedValue([{
      slug: "kowhai", scientific_name: "Sophora microphylla", suggested_spelling: null,
      status: null, threatened: null, threatened_te_kakano: false, over_5m: true, register_code: "SP-1", register_note: null,
      photos: [{ src: "https://example.org/a.jpg", attribution: "A" }, { src: "https://example.org/b.jpg" }], deactivated_at: null,
    }]);
  });

  it("sends signed-out visitors to sign-in before reading anything", async () => {
    mocks.requireAuthenticated.mockRejectedValue(new Error("SIGN_IN"));
    await expect(file("planting_lines.csv")).rejects.toThrow("SIGN_IN");
    await expect(getAll()).rejects.toThrow("SIGN_IN");
    await expect(ExportPage()).rejects.toThrow("SIGN_IN");
    expect(mocks.requireAuthenticated).toHaveBeenCalledWith("/export");
    for (const query of [...queries, mocks.count]) expect(query).not.toHaveBeenCalled();
  });

  it.each(["users.csv", "planting_lines", "planting_lines.txt"])("returns not found for %s", async (name) => {
    await expect(file(name)).rejects.toThrow("NOT_FOUND");
  });

  it("downloads one dated CSV with linked IDs, blank unknowns and deactivated dates", async () => {
    const response = await file("planting_lines.csv");
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toMatch(/^attachment; filename="wrt-planting-lines-\d{4}-\d{2}-\d{2}\.csv"$/);
    const [header, first, second] = (await response.text()).replace(/^﻿/, "").split("\r\n");
    expect(header).toBe("line_id,event_id,site_slug,area_slug,season,planted_on,planting_type,species_slug,scientific_name,quantity,legacy_code,source_file,source_sheet,source_cell,deactivated_at,event_deactivated_at");
    expect(first).toBe("1,7,lake-hayes,lake-hayes-1,Autumn 2019,,,kowhai,Sophora microphylla,0,PH-1,MASTER.xlsx,MASTER,FK10,,2026-11-01T00:00:00Z");
    expect(second).toContain("Sophora microphylla,,PH-2");
  });

  it("exports only the species' image URLs, first one first", async () => {
    const text = await (await file("species.csv")).text();
    expect(text).toContain("https://example.org/a.jpg | https://example.org/b.jpg");
    expect(text).not.toContain(",A,");
  });

  it("zips every file with a README that documents each column", async () => {
    const response = await getAll();
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    const entries = unzipSync(new Uint8Array(await response.arrayBuffer()));
    const names = Object.keys(entries).map((path) => path.split("/").pop());
    expect(names.sort()).toEqual([...EXPORT_FILES.map((f) => `${f.name}.csv`), "README.txt"].sort());
    const readme = strFromU8(defined(Object.entries(entries).find(([path]) => path.endsWith("README.txt")))[1]);
    for (const f of EXPORT_FILES) for (const column of f.columns) expect(readme).toContain(`  ${column.header}: `);
  });

  it("counts each file's rows for the page", async () => {
    mocks.count.mockResolvedValue(5449);
    await ExportPage();
    expect(mocks.count.mock.calls.map(([table]) => table)).toEqual(EXPORT_FILES.map((f) => f.name));
  });
});
