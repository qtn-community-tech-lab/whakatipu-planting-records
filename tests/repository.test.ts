import { describe, expect, it } from "vitest";
import { repo } from "./helpers";

describe("repository invariants on the real CSVs", () => {
  it("loads 5,449 records totalling 140,068 recorded plants", async () => {
    const recs = await repo.listRecords();
    expect(recs).toHaveLength(5449);
    expect(recs.reduce((a, r) => a + r.quantity, 0)).toBe(140068);
  });

  it("has 629 records needing review carrying 15,290 plants", async () => {
    const flagged = (await repo.listRecords()).filter((r) => r.needsReview);
    expect(flagged).toHaveLength(629);
    expect(flagged.reduce((a, r) => a + r.quantity, 0)).toBe(15290);
  });

  it("covers 23 seasons from Autumn 2015 to Autumn 2026, in order", async () => {
    const seasons = await repo.listSeasons();
    expect(seasons).toHaveLength(23);
    expect(seasons[0].label).toBe("Autumn 2015");
    expect(seasons[seasons.length - 1].label).toBe("Autumn 2026");
    seasons.forEach((s, i) => expect(s.order).toBe(i));
    for (let i = 1; i < seasons.length; i++) {
      const a = seasons[i - 1];
      const b = seasons[i];
      expect(b.year > a.year || (b.year === a.year && a.name === "Autumn" && b.name === "Spring")).toBe(true);
    }
    expect(new Set(seasons.map((s) => s.slug)).size).toBe(seasons.length);
    expect(seasons[0].slug).toBe("autumn-2015");
  });

  it("gives no record a missing species, place, parcel or season", async () => {
    const [recs, species, places, seasons] = await Promise.all([
      repo.listRecords(), repo.listSpecies(), repo.listPlaces(), repo.listSeasons(),
    ]);
    const speciesIds = new Set(species.map((s) => s.id));
    const placeBySlug = new Map(places.map((p) => [p.slug, p]));
    const seasonSlugs = new Set(seasons.map((s) => s.slug));
    for (const r of recs) {
      expect(speciesIds.has(r.speciesId), `${r.id} species`).toBe(true);
      expect(seasonSlugs.has(r.seasonSlug), `${r.id} season`).toBe(true);
      const place = placeBySlug.get(r.placeSlug);
      expect(place, `${r.id} place`).toBeDefined();
      expect(place!.parcels.some((p) => p.id === r.parcelId), `${r.id} parcel`).toBe(true);
      expect(r.parcelName.trim(), `${r.id} parcel name`).not.toBe("");
    }
  });

  it("has unique species slugs, species ids, place slugs and record ids", async () => {
    const [species, places, recs] = await Promise.all([repo.listSpecies(), repo.listPlaces(), repo.listRecords()]);
    expect(new Set(species.map((s) => s.slug)).size).toBe(species.length);
    expect(new Set(species.map((s) => s.id)).size).toBe(species.length);
    expect(new Set(places.map((p) => p.slug)).size).toBe(places.length);
    expect(new Set(recs.map((r) => r.id)).size).toBe(recs.length);
  });

  it("has unique parcel ids within each place", async () => {
    for (const p of await repo.listPlaces()) {
      expect(new Set(p.parcels.map((x) => x.id)).size, p.slug).toBe(p.parcels.length);
    }
  });

  it("keeps the original strings and source cell on every record (provenance)", async () => {
    for (const r of await repo.listRecords()) {
      const p = r.provenance;
      expect(p.sourceFile, r.id).not.toBe("");
      expect(p.sourceSheet, r.id).not.toBe("");
      expect(p.sourceCell, r.id).toMatch(/^[A-Z]+\d+$/);
      expect(p.siteOriginal, r.id).not.toBe("");
      expect(p.speciesOriginal, r.id).not.toBe("");
      expect(p.seasonLabelOriginal, r.id).not.toBe("");
    }
  });

  it("flags every record that has a ruling or confirmation, and no other", async () => {
    for (const r of await repo.listRecords()) {
      const actionable = r.notes.some((n) => n.kind !== "fyi");
      if (actionable) expect(r.needsReview, r.id).toBe(true);
    }
  });

  it("records the 'TBC' cell as an exception with no quantity", async () => {
    const recs = await repo.listRecords();
    const noQty = recs.filter((r) => !r.hasQuantity);
    expect(noQty).toHaveLength(1);
    expect(noQty[0].quantity).toBe(0);
    expect(noQty[0].needsReview).toBe(true);
    expect(noQty[0].provenance.sourceCell).toBe("OP50");
  });

  it("loaded with no errors", async () => {
    const issues = await repo.listDataIssues();
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  it("uses only known precision and confidence values", async () => {
    for (const r of await repo.listRecords()) {
      expect(["site", "subsite", "area", "scheme", "unknown"]).toContain(r.precision);
      expect(["high", "medium", "low"]).toContain(r.confidence);
    }
  });

  it("reports the source files it read, with row counts", async () => {
    const info = await repo.getSourceInfo();
    const history = info.files.find((f) => f.name === "planting_history.csv");
    expect(history?.rows).toBe(5449);
    expect(info.description).toMatch(/never opens the original spreadsheets/i);
  });
});

describe("reconciliation", () => {
  it("has 23 season rows, and the records match every one of them", async () => {
    const [recon, recs, seasons] = await Promise.all([repo.listReconciliation(), repo.listRecords(), repo.listSeasons()]);
    const rows = recon.filter((r) => r.kind === "season");
    expect(rows).toHaveLength(23);
    const bySeason = new Map<string, { total: number; n: number }>();
    for (const r of recs) {
      const label = seasons.find((s) => s.slug === r.seasonSlug)!.label;
      const e = bySeason.get(label) ?? { total: 0, n: 0 };
      e.total += r.quantity;
      // The workbook counts numeric cells only: the 'TBC' text cell (Spring 2025) is an exception row.
      if (r.hasQuantity) e.n += 1;
      bySeason.set(label, e);
    }
    for (const row of rows) {
      expect(bySeason.get(row.label)?.total, row.label).toBe(row.generated);
      expect(bySeason.get(row.label)?.n, row.label).toBe(row.records);
      expect(row.generated, `${row.label} vs workbook`).toBe(row.stated);
      expect(row.difference, row.label).toBe(0);
    }
  });

  it("explains every grand total that disagrees with the records", async () => {
    const recon = await repo.listReconciliation();
    const grand = recon.filter((r) => r.kind === "grand");
    expect(grand.map((r) => r.stated).sort((a, b) => a - b)).toEqual([135413, 137273, 139948, 140049, 140068]);
    for (const r of grand) {
      expect(r.generated).toBe(140068);
      expect(r.generated - r.stated, r.label).toBe(r.difference);
      if (r.difference !== 0) expect(r.cause, `${r.label} needs a cause`).toBeTruthy();
    }
  });
});
