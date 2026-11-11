import { defined } from "./assertions";
/**
 * Runs every read query against the Supabase project (tests/live-env.ts), as a signed-out
 * visitor with the publishable key. Skipped when there is no project to read.
 */
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/db/types";

import { key, live, url } from "./live-env";

vi.mock("@/db/client", () => ({
  db: async () => createClient<Database>(url!, key!, { auth: { persistSession: false } }),
}));

const { listSites, listSiteTotals, readSite, listPlantingAreaTotals, listPlantingAreaPins } = await import("@/db/queries/sites");
const { listSpecies, listSpeciesTotals, readSpecies } = await import("@/db/queries/species");
const { findPlantingLines, listSeasons, listSeasonLeaders, PAGE_SIZE } = await import("@/db/queries/plantings");
const { listOpenQuestions, readQuestionTotals } = await import("@/db/queries/review");

const sum = (rows: { plants: number | null }[]) => rows.reduce((n, r) => n + (r.plants ?? 0), 0);

describe.skipIf(!live)("read queries against Supabase", () => {
  it("lists sites, and their plants add up to the whole history", async () => {
    const sites = await listSiteTotals();
    expect(sites.length).toBeGreaterThan(0);
    expect(sum(sites)).toBe(sum(await listSeasons()));
    expect(await listSiteTotals(3)).toEqual(sites.slice(0, 3));
  });

  it("reads the active site register and site descriptions independently of planting history", async () => {
    const sites = await listSites();
    const site = defined(sites[0]);
    expect(await readSite(site.slug)).toMatchObject({ slug: site.slug, name: site.name, description: expect.any(String) });
    expect(await readSite("no-such-site")).toBeNull();
  });

  it("lists areas with totals and pins", async () => {
    const areaTotals = await listPlantingAreaTotals();
    expect(sum(areaTotals)).toBe(sum(await listSeasons()));
    const areas = await listPlantingAreaPins();
    expect(areas.length).toBeGreaterThan(0);
    expect(areaTotals.length).toBeLessThanOrEqual(areas.length);
    const pinned = areas.filter((area) => area.lat !== null && area.lng !== null);
    expect(pinned.length).toBeGreaterThan(0);
    for (const area of pinned) {
      expect(typeof area.description).toBe("string");
      expect(new URL(area.pin_source_url!).protocol).toBe("https:");
      expect(area.pin_checked_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    const site = defined((await listSites())[0]);
    expect((await listPlantingAreaPins(site.slug)).every((a) => a.site === site.slug)).toBe(true);
  });

  it("lists the species register and ranks species by plants", async () => {
    expect((await listSpecies()).length).toBeGreaterThan(0);
    expect(sum(await listSpeciesTotals())).toBe(sum(await listSeasons()));
  });

  it("opens one species with its totals and lines", async () => {
    const top = defined((await listSpeciesTotals())[0]);
    const page = await readSpecies(top.species!);
    expect(page?.totals?.plants).toBe(top.plants);
    expect(page?.history.length).toBe(top.lines);
    expect(await readSpecies("no-such-species")).toBeNull();
  });

  it("lists seasons with recorded planting totals", async () => {
    const seasons = await listSeasons();
    expect(seasons.length).toBeGreaterThan(0);
    expect(sum(seasons)).toBeGreaterThan(0);
  });

  it("pages through lines without skipping or repeating", async () => {
    const first = await findPlantingLines({}, 0);
    const second = await findPlantingLines({}, 1);
    expect(first.length).toBe(PAGE_SIZE);
    expect(new Set([...first, ...second].map((l) => l.line_id)).size).toBe(PAGE_SIZE * 2);
    const season = defined((await listSeasons())[0]);
    expect((await findPlantingLines({ season: season.season! })).every((l) => l.season === season.season)).toBe(true);
  }, 15_000);

  it("ranks the top species and sites in each season", async () => {
    const { species, sites } = await listSeasonLeaders(3);
    const ranked: { season: string | null; plants: number | null; rank: number | null }[][] = [species, sites];
    const activeSeasonCount = (await listSeasons()).filter((season) => (season.plants ?? 0) > 0).length;
    for (const rows of ranked) {
      const perSeason = Map.groupBy(rows, (r) => r.season);
      expect(perSeason.size).toBe(activeSeasonCount);
      for (const top of perSeason.values()) {
        expect(top.map((r) => r.rank)).toEqual([1, 2, 3].slice(0, top.length));
        expect(top.every((r, i) => i === 0 || (r.plants ?? 0) <= (defined(top[i - 1]).plants ?? 0))).toBe(true);
      }
    }
  });

  it("totals the plants still waiting on a question", async () => {
    const totals = await readQuestionTotals("order-scheme");
    expect(totals).not.toBeNull();
    expect(totals!.question).toBe("order-scheme");
    expect(totals!.lines).toBeGreaterThan(0);
    expect(totals!.plants).toBeGreaterThanOrEqual(0);
    expect(await readQuestionTotals("slope-hill-2024")).toBeNull();
    expect(await readQuestionTotals("no-such-question")).toBeNull();
  });

  it("lists the questions WRT still has to answer", async () => {
    const questions = await listOpenQuestions();
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.every((q) => q.openNotes > 0)).toBe(true);
  });
});
