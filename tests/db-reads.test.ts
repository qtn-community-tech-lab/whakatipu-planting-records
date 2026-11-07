/**
 * Runs every read query against the Supabase project in .env.local, as a signed-out
 * visitor with the publishable key. Skipped when there is no project to read.
 */
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/db/types";
import { PAGE_SIZE } from "@/db/queries/views";

try { process.loadEnvFile(".env.local"); } catch {}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

vi.mock("@/db/client", () => ({
  db: async () => createClient<Database>(url!, key!, { auth: { persistSession: false } }),
}));

const { listSites, listPlantingAreaTotals, listPlantingAreaPins } = await import("@/db/queries/sites");
const { listSpecies, listSpeciesTotals, readSpecies } = await import("@/db/queries/species");
const { findPlantingLines, listSeasons } = await import("@/db/queries/plantings");
const { listOpenQuestions } = await import("@/db/queries/review");

/** All plants in the workbook history. */
const ALL_PLANTS = 140_068;
const sum = (rows: { plants: number | null }[]) => rows.reduce((n, r) => n + (r.plants ?? 0), 0);

describe.skipIf(!url || !key)("read queries against Supabase", () => {
  it("lists sites, and their plants add up to the whole history", async () => {
    const sites = await listSites();
    expect(sites.length).toBeGreaterThan(0);
    expect(sum(sites)).toBe(ALL_PLANTS);
    expect(await listSites(3)).toEqual(sites.slice(0, 3));
  });

  it("lists areas with totals and pins", async () => {
    expect(sum(await listPlantingAreaTotals())).toBe(ALL_PLANTS);
    expect((await listPlantingAreaPins()).length).toBe(78);
    const [site] = await listSites();
    expect((await listPlantingAreaPins(site.site!)).every((a) => a.site === site.site)).toBe(true);
  });

  it("lists the species register and ranks species by plants", async () => {
    expect((await listSpecies()).length).toBe(164);
    expect(sum(await listSpeciesTotals())).toBe(ALL_PLANTS);
  });

  it("opens one species with its totals and lines", async () => {
    const [top] = await listSpeciesTotals();
    const page = await readSpecies(top.species!);
    expect(page?.totals?.plants).toBe(top.plants);
    expect(page?.history.length).toBe(top.lines);
    expect(await readSpecies("no-such-species")).toBeNull();
  });

  it("lists every season, each matching its workbook TOTAL cell", async () => {
    const seasons = await listSeasons();
    expect(seasons.length).toBe(25);
    expect(sum(seasons)).toBe(ALL_PLANTS);
    for (const s of seasons) if (s.workbook_total !== null) expect(s.plants).toBe(s.workbook_total);
  });

  it("pages through lines without skipping or repeating", async () => {
    const first = await findPlantingLines({}, 0);
    const second = await findPlantingLines({}, 1);
    expect(first.length).toBe(PAGE_SIZE);
    expect(new Set([...first, ...second].map((l) => l.line_id)).size).toBe(PAGE_SIZE * 2);
    const [season] = await listSeasons();
    expect((await findPlantingLines({ season: season.season! })).every((l) => l.season === season.season)).toBe(true);
  });

  it("lists the questions WRT still has to answer", async () => {
    const questions = await listOpenQuestions();
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.every((q) => q.openNotes > 0)).toBe(true);
  });
});
