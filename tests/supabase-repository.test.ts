import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/db/types";
import { SupabaseWrtRepository } from "@/db/repository";
import { createQueries, emptySplit } from "@/lib/wrt/queries";
import { locationsForSites } from "@/lib/wrt/site-locations";

// The live repository must work when workbook files are absent from the deployment.
vi.mock("node:fs", () => ({
  readFileSync: () => { throw new Error("Workbook files unavailable"); },
}));

describe("Supabase repository without workbook files", () => {
  it.each([null, "2026-11-11T00:00:00Z"])("preserves database history when the site deactivation timestamp is %s", async (deactivated_at) => {
    const rows: Record<string, unknown[]> = {
      seasons: [{ slug: "autumn-2030", label: "Autumn 2030", year: 2030, half: "autumn" }],
      species: [{ slug: "kowhai", register_code: "SP-1", scientific_name: "Sophora microphylla", profile: {}, photos: [] }],
      sites: [
        { slug: "reserve", name: "Reserve", description: "Planting beside the river.", is_scheme: false, deactivated_at },
        { slug: "new-site", name: "New site", description: "", is_scheme: false },
        { slug: "empty-site", name: "Empty site", description: "", is_scheme: false },
      ],
      areas: [
        { slug: "reserve-east", site: "reserve", name: "East", wrt_number: "1A", class: "community" },
        { slug: "reserve-west", site: "reserve", name: "West", wrt_number: null, class: "school" },
        { slug: "new-area", site: "new-site", name: "Riverbank", wrt_number: null, class: "keystone" },
      ],
      line_details: [{
        line_id: 1, legacy_code: "PH-1", season: "autumn-2030", area: "reserve-east", area_name: "East",
        species: "kowhai", quantity: 12, needs_review: false, notes: [], source_cell: "A1",
      }],
      totals_by_season: [{
        season_label: "Autumn 2030", plants: 12, lines: 1, workbook_total: 10, workbook_cell: "MASTER!A2",
      }],
    };
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const table = new URL(input instanceof Request ? input.url : input.toString()).pathname.split("/").at(-1)!;
      if (table === "sites") {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        expect(url.searchParams.has("deactivated_at")).toBe(false);
      }
      if (!(table in rows)) throw new Error(`Unexpected table: ${table}`);
      return new Response(JSON.stringify(rows[table]), { headers: { "Content-Type": "application/json" } });
    });
    const db = createClient<Database>("https://example.supabase.co", "test-key", {
      auth: { persistSession: false }, global: { fetch },
    });
    const repo = new SupabaseWrtRepository(() => db);
    const [records, reconciliation, info] = await Promise.all([
      repo.listRecords(), repo.listReconciliation(), repo.getSourceInfo(),
    ]);

    expect(records).toMatchObject([{ id: "PH-1", year: 2030, quantity: 12, placeSlug: "reserve", parcelId: "1A" }]);
    expect(reconciliation).toEqual([{
      kind: "season", label: "Autumn 2030", generated: 12, stated: 10, difference: 2,
      statedCell: "MASTER!A2", records: 1, cause: null,
    }]);
    expect(info.tables).toContainEqual({ name: "planting lines", rows: 1 });
    const places = await repo.listPlaces();
    expect(places).toMatchObject([
      { slug: "empty-site", parcels: [], siteClasses: [], searchKeys: ["empty site"] },
      { slug: "new-site", parcels: [{ id: "new-area", name: "Riverbank" }], siteClasses: ["keystone"] },
      { slug: "reserve", description: "Planting beside the river.", siteClasses: ["community", "school"],
        parcels: [{ id: "1A" }, { id: "reserve-west" }] },
    ]);
    expect(info.tables).toContainEqual({ name: "sites", rows: 3 });
    expect(new Set(fetch.mock.calls.map(([input]) =>
      new URL(input instanceof Request ? input.url : input.toString()).pathname.split("/").at(-1),
    ))).toEqual(new Set(Object.keys(rows)));

    const queries = createQueries(repo);
    expect((await queries.lookups()).places).toEqual(places);
    for (const term of ["New site", "Riverbank", "Empty site"]) {
      const result = await queries.search(term);
      expect(result.places[0]).toMatchObject({ split: emptySplit() });
      expect(result.places[0]?.item.slug).toBe(term === "Empty site" ? "empty-site" : "new-site");
    }
    expect((await queries.overview()).split.total).toBe(12);
    expect((await queries.place("reserve"))!.split.total).toBe(12);
    expect((await queries.records({ place: "reserve" })).rows).toHaveLength(1);
    expect((await queries.species("kowhai"))!.split.total).toBe(12);
    expect((await queries.season("autumn-2030"))!.split.total).toBe(12);
    // Historical rankings still describe recorded planting, rather than the register.
    expect((await queries.places()).map((p) => p.item.slug)).toEqual(["reserve"]);
    expect(locationsForSites([{
      slug: "new-area", site: "new-site", name: "Riverbank", description: "", wrt_number: null,
      lat: -45, lng: 168.5, pin_source_url: null, pin_checked_on: null,
    }], places, records)).toMatchObject([{ siteSlug: "new-site", split: emptySplit() }]);
  });
});
