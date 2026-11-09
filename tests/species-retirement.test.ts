import { describe, expect, it } from "vitest";
import { CsvWrtRepository } from "@/lib/wrt/csv/csv-repository";
import { createQueries } from "@/lib/wrt/queries";
import { recordsToCsv } from "@/lib/wrt/records-csv";

const retiredAt = "2026-11-09T00:00:00.000Z";
const slug = "leptospermum-scoparium";

class RetiredSpeciesRepository extends CsvWrtRepository {
  override async listSpecies() {
    return (await super.listSpecies()).map((species) => species.slug === slug
      ? { ...species, deactivatedAt: retiredAt } : species);
  }
}

describe("retired species history", () => {
  const active = createQueries(new CsvWrtRepository());
  const retired = createQueries(new RetiredSpeciesRepository());

  it("keeps the species identity, records, quantities and review splits", async () => {
    const before = (await active.species(slug))!;
    const after = (await retired.species(slug))!;
    expect(after.species).toEqual({ ...before.species, deactivatedAt: retiredAt });
    expect(after.split).toEqual(before.split);
    expect(after.seasons).toEqual(before.seasons);
    expect(after.years).toEqual(before.years);
    expect(after.records.map((r) => r.record)).toEqual(before.records.map((r) => r.record));
    expect(after.records.every((r) => r.species.id === before.species.id)).toBe(true);
  });

  it("leaves overview, site and season totals unchanged", async () => {
    expect((await retired.overview()).split).toEqual((await active.overview()).split);
    const detail = (await active.species(slug))!;
    for (const { item } of detail.places) {
      expect((await retired.place(item.slug))!.split).toEqual((await active.place(item.slug))!.split);
    }
    for (const { season } of detail.seasons) {
      expect((await retired.season(season.slug))!.split).toEqual((await active.season(season.slug))!.split);
    }
  });

  it("keeps retired species in historical filters, rankings and CSV exports", async () => {
    const before = await active.records({ species: slug });
    const after = await retired.records({ species: slug });
    expect(after.split).toEqual(before.split);
    expect(recordsToCsv(after.rows)).toBe(recordsToCsv(before.rows));
    expect((await retired.lookups()).species.some((s) => s.slug === slug)).toBe(true);
    expect((await retired.speciesList()).map((r) => [r.item.id, r.split]))
      .toEqual((await active.speciesList()).map((r) => [r.item.id, r.split]));
  });
});
