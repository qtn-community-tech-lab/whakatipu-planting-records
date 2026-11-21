import { describe, expect, it, vi } from "vitest";
import { createPublicHistoryQueries } from "@/db/queries/public-history";
import type { Tables } from "@/db/types";
import catalogue from "@/data/species.json";
import { defined } from "./assertions";

const first = defined(catalogue[0]);

async function speciesFromDb(reference: Partial<Tables<"species">> = {}) {
  const row = { ...first, slug: "database-species", ...reference };
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/read_history_references")) {
      return new Response(JSON.stringify({ seasons: [], sites: [], areas: [], species: [row] }), { headers: { "Content-Type": "application/json" } });
    }
    if (url.pathname.endsWith("/read_planting_summary")) return new Response(JSON.stringify({
      totals: { total: 0, resolved: 0, needsReview: 0, records: 0, recordsNeedingReview: 0,
        sites: 0, species: 0, seasons: 0, firstSeason: null, lastSeason: null }, rows: [],
    }), { headers: { "Content-Type": "application/json" } });
    throw new Error(`Unexpected raw history request: ${url.pathname}`);
  });
  try { return defined((await createPublicHistoryQueries(() => true).speciesList("full"))[0]?.item); }
  finally { fetch.mockRestore(); vi.unstubAllEnvs(); }
}

describe("database species references", () => {
  it("uses saved reference content, ordered sources and images", async () => {
    const photos = first.photos.slice().reverse();
    const sources = first.sources.slice().reverse();
    const species = await speciesFromDb({ summary: "Description from the database.", sources, photos });
    expect(species.summary).toBe("Description from the database.");
    expect(species.lookFor).toBe(first.look_for);
    expect(species.sources).toEqual(sources);
    expect(species.checkedAt).toBe(first.checked_at);
    expect(species.photos).toEqual(photos);
  });

  it("keeps empty database references empty even for a catalogued species", async () => {
    const species = await speciesFromDb({ summary: null, look_for: null, sources: [], checked_at: null, photos: [] });
    expect(species.summary).toBeNull();
    expect(species.lookFor).toBeNull();
    expect(species.sources).toEqual([]);
    expect(species.checkedAt).toBeNull();
    expect(species.photos).toEqual([]);
  });

  it("loads deactivated species for historical joins and exposes the saved timestamp", async () => {
    const deactivated_at = "2026-11-09T00:00:00.000Z";
    const species = await speciesFromDb({ deactivated_at });
    expect(species.deactivatedAt).toBe(deactivated_at);
    expect(species.id).toBe(first.register_code);
  });

  it("uses the species slug when there is no imported register code", async () => {
    const species = await speciesFromDb({ register_code: null });
    expect(species.slug).toBe("database-species");
  });

  it.each(["summary", "look_for", "checked_at"] as const)("retains other fields when %s is missing", async (field) => {
    const species = await speciesFromDb({ [field]: null });
    expect(species.summary).toBe(field === "summary" ? null : first.summary);
    expect(species.lookFor).toBe(field === "look_for" ? null : first.look_for);
    expect(species.checkedAt).toBe(field === "checked_at" ? null : first.checked_at);
  });

  it("uses edited canonical names and lists each Māori name once", async () => {
    const species = await speciesFromDb({
      scientific_name: "Updated botanical name", common_name: "Updated common name", maori_name: "Preferred Māori name",
      maori_name_alternatives: ["Preferred Māori name", "Alternative Māori name"],
    });
    expect(species.commonName).toBe("Updated common name");
    expect(species.maoriName).toBe("Preferred Māori name");
    expect(species.maoriNameAlternatives).toEqual(["Preferred Māori name", "Alternative Māori name"]);
  });
});
