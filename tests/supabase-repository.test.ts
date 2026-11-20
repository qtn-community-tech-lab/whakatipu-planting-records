import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/db/types";
import { publicDb, SupabaseWrtRepository } from "@/db/repository";
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
      species: [{ slug: "kowhai", register_code: "SP-1", scientific_name: "Sophora microphylla", maori_name_alternatives: [], summary: null, look_for: null, sources: [], checked_at: null, photos: [] }],
      sites: [
        { slug: "reserve", name: "Reserve", description: "Planting beside the river.", deactivated_at },
        { slug: "new-site", name: "New site", description: "", deactivated_at: null },
        { slug: "empty-site", name: "Empty site", description: "", deactivated_at: null },
        { slug: "old-site", name: "Old site", description: "Historical site.", deactivated_at: "2026-11-01T00:00:00Z" },
      ],
      areas: [
        { slug: "reserve-east", site: "reserve", name: "East", wrt_number: "1A", class: "community", deactivated_at: null },
        { slug: "reserve-west", site: "reserve", name: "West", wrt_number: null, class: "school", deactivated_at: "2026-11-01T00:00:00Z" },
        { slug: "new-area", site: "new-site", name: "Riverbank", wrt_number: null, class: "keystone", deactivated_at: null },
        { slug: "old-area", site: "old-site", name: "Old area", wrt_number: null, class: "community", deactivated_at: "2026-11-01T00:00:00Z" },
      ],
      line_details: [{
        line_id: 1, legacy_code: "PH-1", season: "autumn-2030", area: "reserve-east", area_name: "East",
        species: "kowhai", quantity: 12, needs_review: false, notes: [], source_cell: "A1",
      }, {
        line_id: 2, legacy_code: "PH-2", season: "autumn-2030", area: "old-area", area_name: "Old area",
        species: "kowhai", quantity: 5, needs_review: false, notes: [], source_cell: "B1",
      }],
      totals_by_season: [{
        season_label: "Autumn 2030", plants: 17, lines: 2, workbook_total: 10, workbook_cell: "MASTER!A2",
      }],
    };
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const table = new URL(input instanceof Request ? input.url : input.toString()).pathname.split("/").at(-1)!;
      if (table === "sites" || table === "areas") {
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

    expect(fetch.mock.calls.filter(([url]) => String(url).includes("/line_details?"))).toHaveLength(1);
    expect(records).toMatchObject([
      { id: "PH-1", year: 2030, quantity: 12, placeSlug: "reserve", parcelId: "1A" },
      { id: "PH-2", year: 2030, quantity: 5, placeSlug: "old-site", parcelId: "old-area" },
    ]);
    expect(reconciliation).toEqual([{
      kind: "season", label: "Autumn 2030", generated: 17, stated: 10, difference: 7,
      statedCell: "MASTER!A2", records: 2, cause: null,
    }]);
    expect(info.tables).toContainEqual({ name: "planting lines", rows: 2 });
    const places = await repo.listPlaces();
    expect(places).toMatchObject([
      { slug: "empty-site", parcels: [], siteClasses: [], searchKeys: ["empty site"] },
      { slug: "new-site", parcels: [{ id: "new-area", name: "Riverbank" }], siteClasses: ["keystone"] },
      { slug: "old-site", description: "Historical site.",
        parcels: [{ id: "old-area", deactivatedAt: "2026-11-01T00:00:00Z" }] },
      { slug: "reserve", description: "Planting beside the river.", siteClasses: ["community", "school"],
        parcels: [{ id: "1A" }, { id: "reserve-west" }] },
    ]);
    expect(info.tables).toContainEqual({ name: "sites", rows: 4 });
    expect(new Set(fetch.mock.calls.map(([input]) =>
      new URL(input instanceof Request ? input.url : input.toString()).pathname.split("/").at(-1),
    ))).toEqual(new Set(Object.keys(rows)));

    const queries = createQueries(repo);
    expect((await queries.lookups()).places).toEqual(places);
    expect((await queries.place("old-site"))?.split.total).toBe(5);
    expect((await queries.search("Old site")).places[0]?.item.slug).toBe("old-site");
    for (const term of ["New site", "Riverbank", "Empty site"]) {
      const result = await queries.search(term);
      expect(result.places[0]).toMatchObject({ split: emptySplit() });
      expect(result.places[0]?.item.slug).toBe(term === "Empty site" ? "empty-site" : "new-site");
    }
    expect((await queries.overview()).split.total).toBe(17);
    expect((await queries.place("reserve"))!.split.total).toBe(12);
    expect((await queries.records({ place: "reserve" })).rows).toHaveLength(1);
    expect((await queries.species("kowhai"))!.split.total).toBe(17);
    expect((await queries.season("autumn-2030"))!.split.total).toBe(17);
    // Historical rankings still describe recorded planting, rather than the register.
    expect((await queries.places()).map((p) => p.item.slug)).toEqual(["reserve", "old-site"]);
    expect(locationsForSites([{
      slug: "new-area", site: "new-site", name: "Riverbank", description: "", wrt_number: null,
      lat: -45, lng: 168.5, pin_source_url: null, pin_checked_on: null,
    }], places, records)).toMatchObject([{ siteSlug: "new-site", split: emptySplit() }]);
  });
});

function historyTables(): Record<string, unknown[]> {
  return {
    seasons: [{ slug: "autumn-2030", label: "Autumn 2030", year: 2030, half: "autumn" }],
    species: [{ slug: "kowhai", register_code: "SP-1", scientific_name: "Sophora microphylla", maori_name_alternatives: [], sources: [], photos: [], deactivated_at: null }],
    sites: [{ slug: "reserve", name: "Reserve", description: "", deactivated_at: null }],
    areas: [{ slug: "reserve-east", site: "reserve", name: "East", wrt_number: "1A", class: "community", deactivated_at: null }],
    line_details: [{ line_id: 1, legacy_code: "PH-1", season: "autumn-2030", area: "reserve-east", area_name: "East", species: "kowhai", quantity: 17, notes: [] }],
    totals_by_season: [],
  };
}

function tableResponse(rows: Record<string, unknown[]>, input: RequestInfo | URL) {
  const table = new URL(input instanceof Request ? input.url : input.toString()).pathname.split("/").at(-1)!;
  return new Response(JSON.stringify(rows[table]), { headers: { "Content-Type": "application/json" } });
}

it.each([false, true])("recovers after empty history is seeded (reference tables present: %s)", async (hasReferences) => {
  let rows: Record<string, unknown[]> = hasReferences
    ? { ...historyTables(), line_details: [] }
    : Object.fromEntries(Object.keys(historyTables()).map((table) => [table, []]));
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    expect(init?.cache).toBe("no-store");
    expect(init?.next?.revalidate).toBeUndefined();
    return tableResponse(rows, input);
  });
  try {
    const empty = new SupabaseWrtRepository(publicDb);
    const overview = await createQueries(empty).overview();
    expect(overview).toMatchObject({ firstSeason: null, lastSeason: null, seasons: [], split: emptySplit() });
    await empty.listRecords();
    expect(fetch).toHaveBeenCalledTimes(6);
    rows = historyTables();
    const seeded = await createQueries(new SupabaseWrtRepository(publicDb)).overview();
    expect(seeded.firstSeason?.slug).toBe("autumn-2030");
    expect(seeded.split.total).toBe(17);
    expect(seeded.species[0]?.item.slug).toBe("kowhai");
    expect(fetch).toHaveBeenCalledTimes(12);
  } finally {
    fetch.mockRestore();
    vi.unstubAllEnvs();
  }
});

it.each([
  ["seasons", "season autumn-2030"], ["species", "species kowhai"],
  ["areas", "area reserve-east"], ["sites", "site reserve"],
])("reports incomplete %s reads without dropping planting quantities", async (table, reference) => {
  const rows = historyTables();
  rows[table] = [];
  const db = createClient<Database>("https://example.supabase.co", "test-key", {
    auth: { persistSession: false }, global: { fetch: async (input) => tableResponse(rows, input) },
  });
  await expect(new SupabaseWrtRepository(() => db).listRecords()).rejects.toThrow(`Planting history is incomplete: line PH-1 references unavailable ${reference}`);
});
