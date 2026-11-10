/**
 * Supabase figures match the one-off workbook import fixture. Runs against the
 * Supabase project (tests/live-env.ts) as a signed-out visitor; skipped without one.
 */
import { describe, expect, it } from "vitest";
import { live as ready } from "./live-env";
import { q as workbook } from "./helpers";
import { createQueries } from "@/lib/wrt/queries";
import { SupabaseWrtRepository } from "@/db/repository";


const db = createQueries(new SupabaseWrtRepository());

/** What a page shows for a ranked list: names and figures, in order. */
const ranked = (rows: { item: unknown; split: unknown }[]) =>
  rows.map((r) => [typeof r.item === "object" && r.item && "slug" in r.item ? r.item.slug : r.item, r.split]);
/** Provisional ids (NEW-…, unnumbered-…) were never WRT numbers, so Supabase keeps the part's own slug instead. */
const part = (id: string, name: string) => (/^(NEW-|unnumbered-)/.test(id) || !/^[0-9]/.test(id) ? name : id);
const seasonsOf = (rows: { season: { slug: string }; split: unknown }[]) => rows.map((r) => [r.season.slug, r.split]);

describe.skipIf(!ready)("Supabase matches the workbook import", { timeout: 120_000 }, () => {
  it("home: totals, counts and rankings", async () => {
    const [a, b] = await Promise.all([workbook.overview(), db.overview()]);
    expect(b.split).toEqual(a.split);
    expect([b.placeCount, b.schemeCount, b.parcelCount, b.speciesCount]).toEqual([a.placeCount, a.schemeCount, a.parcelCount, a.speciesCount]);
    expect(seasonsOf(b.seasons)).toEqual(seasonsOf(a.seasons));
    expect(ranked(b.places)).toEqual(ranked(a.places));
    expect(ranked(b.species)).toEqual(ranked(a.species));
    expect(ranked(b.byClass)).toEqual(ranked(a.byClass));
    expect(ranked(b.byConfidence)).toEqual(ranked(a.byConfidence));
    expect(ranked(b.byPrecision)).toEqual(ranked(a.byPrecision));
    expect(ranked(b.themes.map((t) => ({ item: t.theme, split: t.split })))).toEqual(ranked(a.themes.map((t) => ({ item: t.theme, split: t.split }))));
  });

  it("sites list and every site page", async () => {
    const [a, b] = await Promise.all([workbook.places(), db.places()]);
    expect(b.map((p) => [p.item.slug, p.item.name, p.item.siteClasses, p.split, p.span.first.slug, p.span.last.slug, p.speciesCount]))
      .toEqual(a.map((p) => [p.item.slug, p.item.name, p.item.siteClasses, p.split, p.span.first.slug, p.span.last.slug, p.speciesCount]));
    for (const { item } of a) {
      const [x, y] = await Promise.all([workbook.place(item.slug), db.place(item.slug)]);
      expect(y!.place.parcels.map((p) => [part(p.id, p.name), p.name, p.siteClass])).toEqual(x!.place.parcels.map((p) => [part(p.id, p.name), p.name, p.siteClass]));
      expect(seasonsOf(y!.seasons)).toEqual(seasonsOf(x!.seasons));
      expect(y!.years).toEqual(x!.years);
      expect(ranked(y!.species)).toEqual(ranked(x!.species));
      expect(y!.parcels.map((p) => [part(p.item.id, p.item.name), p.split])).toEqual(x!.parcels.map((p) => [part(p.item.id, p.item.name), p.split]));
      expect(y!.themes).toEqual(x!.themes);
      expect(y!.records.map((r) => [r.record.id, r.record.quantity, r.record.needsReview])).toEqual(x!.records.map((r) => [r.record.id, r.record.quantity, r.record.needsReview]));
    }
  });

  it("species list and every species page", async () => {
    const [a, b] = await Promise.all([workbook.speciesList(), db.speciesList()]);
    expect(b.map((s) => [s.item.slug, s.item.id, s.item.displayName, s.split, s.placeCount])).toEqual(a.map((s) => [s.item.slug, s.item.id, s.item.displayName, s.split, s.placeCount]));
    for (const { item } of a) {
      const [x, y] = await Promise.all([workbook.species(item.slug), db.species(item.slug)]);
      expect(seasonsOf(y!.seasons)).toEqual(seasonsOf(x!.seasons));
      expect(ranked(y!.places)).toEqual(ranked(x!.places));
      expect(y!.contested.map((s) => s.slug).sort()).toEqual(x!.contested.map((s) => s.slug).sort());
      expect(y!.themes).toEqual(x!.themes);
    }
  });

  it("seasons and records", async () => {
    expect(seasonsOf(await db.seasons())).toEqual(seasonsOf(await workbook.seasons()));
    const [a, b] = await Promise.all([workbook.records(), db.records()]);
    expect(b.split).toEqual(a.split);
    expect(b.rows.map((r) => r.record.id)).toEqual(a.rows.map((r) => r.record.id));
    const filter = { review: "needs-review" as const, theme: "slope-hill-2024" as const };
    expect((await db.records(filter)).split).toEqual((await workbook.records(filter)).split);
  });

  it("about the data: workbook checks and threatened species", async () => {
    const [a, b] = await Promise.all([workbook.dataQuality(), db.dataQuality()]);
    expect(b.reconciliation.map((r) => [r.kind, r.label, r.generated, r.stated, r.statedCell])).toEqual(a.reconciliation.map((r) => [r.kind, r.label, r.generated, r.stated, r.statedCell]));
    expect(b.threatened.map((t) => [t.item.slug, t.agreed, t.split.total, t.placeCount])).toEqual(a.threatened.map((t) => [t.item.slug, t.agreed, t.split.total, t.placeCount]));
  });
});
