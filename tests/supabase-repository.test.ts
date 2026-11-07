import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/db/types";
import { SupabaseWrtRepository } from "@/db/repository";

// The live repository must work when workbook files are absent from the deployment.
vi.mock("node:fs", () => ({
  readFileSync: () => { throw new Error("Workbook files unavailable"); },
}));

describe("Supabase repository without workbook files", () => {
  it("reads records and season checks entirely from the database", async () => {
    const rows: Record<string, unknown[]> = {
      seasons: [{ slug: "autumn-2030", label: "Autumn 2030", year: 2030, half: "autumn" }],
      species: [{ slug: "kowhai", register_code: "SP-1", scientific_name: "Sophora microphylla" }],
      sites: [{ slug: "reserve", name: "Reserve", is_scheme: false }],
      areas: [{ slug: "reserve-east", site: "reserve", name: "East", wrt_number: "1A", class: "community" }],
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
    expect(fetch).toHaveBeenCalledTimes(6);
  });
});
