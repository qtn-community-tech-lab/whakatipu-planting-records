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

const { listSites, listPlantingAreaTotals, listPlantingAreaPins } = await import("@/db/queries/sites");
const { listSpecies, listSpeciesTotals, readSpecies } = await import("@/db/queries/species");
const { findPlantingLines, listSeasons, listSeasonLeaders, PAGE_SIZE } = await import("@/db/queries/plantings");
const { listOpenQuestions, readQuestionTotals } = await import("@/db/queries/review");

/** All plants in the workbook history. */
const ALL_PLANTS = 140_068;
const sum = (rows: { plants: number | null }[]) => rows.reduce((n, r) => n + (r.plants ?? 0), 0);

describe.skipIf(!live)("read queries against Supabase", () => {
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

  it("ranks the top species and sites in each season", async () => {
    const { species, sites } = await listSeasonLeaders(3);
    const ranked: { season: string | null; plants: number | null; rank: number | null }[][] = [species, sites];
    for (const rows of ranked) {
      const perSeason = Map.groupBy(rows, (r) => r.season);
      expect(perSeason.size).toBe(23);
      for (const top of perSeason.values()) {
        expect(top.map((r) => r.rank)).toEqual([1, 2, 3].slice(0, top.length));
        expect(top.every((r, i) => i === 0 || (r.plants ?? 0) <= (top[i - 1].plants ?? 0))).toBe(true);
      }
    }
  });

  it("totals the plants still waiting on a question", async () => {
    expect(await readQuestionTotals("order-scheme")).toEqual({ question: "order-scheme", lines: 160, plants: 1_457 });
    expect(await readQuestionTotals("slope-hill-2024")).toBeNull();
    expect(await readQuestionTotals("no-such-question")).toBeNull();
  });

  it("lists the questions WRT still has to answer", async () => {
    const questions = await listOpenQuestions();
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.every((q) => q.openNotes > 0)).toBe(true);
  });
});
