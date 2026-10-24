import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/types";
import { readExplorer } from "@/db/queries/explorer";
import { createQueries } from "@/lib/wrt/queries";

const audit = { id: "item", created_by: "actor", updated_by: "actor", created_at: "2026-01-01", updated_at: "2026-01-01", deactivated_at: null };
function clientFixture() {
  const species = { ...audit, id: "species", slug: "manuka", scientific_name: "Leptospermum scoparium", common_name: "Tea tree", maori_name: "Mānuka", description: "Saved description", image_url: "https://example.invalid/image.jpg", aliases: ["Manuka"], threatened: null, threatened_te_kakano: false, over_5m: null, register_note: null, register_code: "SP-001" };
  const site = { ...audit, id: "site", slug: "reserve", name: "Reserve", description: "Saved site", location_id: "pin", is_scheme: false };
  const area = { ...audit, id: "area", slug: "upper", name: "Upper reserve", description: "Saved area", site_id: "site", location_id: null, site_class: null, aliases: [], wrt_number: null };
  const location = { ...audit, id: "pin", label: "Reserve pin", geometry: { type: "Point", coordinates: [168.8, -45] }, radius_m: null, source_url: null, coordinate_source_url: null, coordinate_method: null, checked_on: null };
  const tables: Record<string, unknown[]> = {
    species: Array.from({ length: 1001 }, (_, i) => ({ ...species, id: i ? `species-${i}` : species.id, slug: i ? `species-${i}` : species.slug })),
    sites: [site], planting_areas: [area], locations: [location],
    seasons: [{ ...audit, id: "season", name: "Autumn 2015" }],
    planting_event_species: Array.from({ length: 1003 }, (_, i) => ({ ...audit, id: `line-${String(i).padStart(5, "0")}`, species_id: "species", planting_event_id: `event-${i}`, quantity: i === 0 ? null : 1, precision: null, legacy_code: null, provenance: { source_file: "Workbook.xlsx", source_cell: "A1" }, event: { ...audit, id: `event-${i}`, site_id: "site", planting_area_id: i === 0 ? null : "area", season: "winter 1999", planting_date: i === 0 ? null : "2026-06-01", notes: "Saved note", source: "workbook", event_type: null, image_url: "", site: { slug: site.slug, name: site.name, deactivated_at: null }, area: i === 0 ? null : { slug: area.slug, name: area.name, deactivated_at: null } }, species: { slug: species.slug, scientific_name: species.scientific_name, maori_name: species.maori_name, deactivated_at: null } })),
  };
  const requests: URL[] = [];
  const db = createClient<Database>("https://example.invalid", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input) => {
      const url = new URL(String(input)); requests.push(url);
      const table = url.pathname.split("/").at(-1)!;
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const limit = Number(url.searchParams.get("limit") ?? 1000);
      return new Response(JSON.stringify(tables[table].slice(offset, offset + limit)), { headers: { "Content-Type": "application/json" } });
    } },
  });
  return { db, requests };
}

describe("Supabase explorer reads", () => {
  it("paginates catalogues and joined lines without losing records, dates or nulls", async () => {
    const { db, requests } = clientFixture();
    const data = await readExplorer(db);
    expect(data.species).toHaveLength(1001);
    expect(data.records).toHaveLength(1003);
    expect(data.seasons).toEqual(["Autumn 2015"]);
    expect(data.species[0]).toMatchObject({ id: "species", displayName: "Mānuka", description: "Saved description", imageUrl: "https://example.invalid/image.jpg", threatened: null });
    expect(data.records[0]).toMatchObject({ quantity: null, year: null, plantingDate: null, parcelId: null, seasonName: "winter 1999", notes: "Saved note", provenance: { sourceFile: "Workbook.xlsx", sourceCell: "A1" } });
    expect(data.records[1].year).toBe(2026);
    expect(data.places[0].parcels[0].location?.longitude).toBe(168.8);
    const q = createQueries(async () => data);
    expect((await q.overview()).split).toEqual({ total: 1002, records: 1003, unknown: 1 });
    expect((await q.lookups()).years).toEqual([2026]);
    expect((await q.seasons()).map((s) => s.season.label)).toEqual(["Autumn 2015", "winter 1999"]);
    expect(requests.filter((u) => u.pathname.endsWith("species") && !u.pathname.endsWith("event_species")).map((u) => u.searchParams.get("offset"))).toEqual(["0", "1000"]);
    expect(requests.filter((u) => u.pathname.endsWith("event_species"))).toHaveLength(11);
    expect(requests.every((u) => u.searchParams.get("deactivated_at") === "is.null")).toBe(true);
    expect(requests.every((u) => u.searchParams.get("order") === "id.asc")).toBe(true);
  });
  it("does not convert database failures into an empty catalogue", async () => {
    const db = createClient<Database>("https://example.invalid", "test-key", { auth: { persistSession: false }, global: { fetch: async () => new Response(JSON.stringify({ message: "Database unavailable", code: "test" }), { status: 500, headers: { "Content-Type": "application/json" } }) } });
    await expect(readExplorer(db)).rejects.toMatchObject({ message: "Database unavailable" });
  });
});
