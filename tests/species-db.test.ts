import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { SupabaseWrtRepository } from "@/db/repository";
import type { Database, Tables } from "@/db/types";
import catalogue from "@/data/species.json";
import { defined } from "./assertions";

const first = defined(catalogue[0]);

async function speciesFromDb(reference: Partial<Tables<"species">> = {}) {
  const row = { ...first, slug: "database-species", ...reference };
  const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/species")) {
      const selected = url.searchParams.get("select")!.split(",");
      expect(selected).not.toContain("profile");
      expect(selected).not.toContain("name_note");
      for (const column of ["scientific_name", "common_name", "maori_name", "maori_name_alternatives", "summary", "look_for", "sources", "checked_at"]) expect(selected).toContain(column);
      return new Response(JSON.stringify([row]), { headers: { "Content-Type": "application/json" } });
    }
    return new Response("[]", { headers: { "Content-Type": "application/json" } });
  });
  const db = createClient<Database>("https://example.supabase.co", "test-key", {
    auth: { persistSession: false }, global: { fetch },
  });
  return defined((await new SupabaseWrtRepository(() => db).listSpecies())[0]);
}

describe("database species references", () => {
  it("uses saved reference content, ordered sources and images", async () => {
    const photos = first.photos.slice().reverse();
    const sources = first.sources.slice().reverse();
    const species = await speciesFromDb({ summary: "Description from the database.", sources, photos });
    expect(species.profile).toMatchObject({
      scientificName: first.scientific_name, summary: "Description from the database.",
      lookFor: first.look_for, sources, checkedAt: first.checked_at,
    });
    expect(species.profile).not.toHaveProperty("nameNote");
    expect(species.photos).toEqual(photos);
  });

  it("keeps empty database references empty even for a catalogued species", async () => {
    const species = await speciesFromDb({ summary: null, look_for: null, sources: [], checked_at: null, photos: [] });
    expect(species.profile).toBeNull();
    expect(species.photos).toEqual([]);
  });

  it("loads deactivated species for historical joins and exposes the saved timestamp", async () => {
    const deactivated_at = "2026-11-09T00:00:00.000Z";
    const species = await speciesFromDb({ deactivated_at });
    expect(species.deactivatedAt).toBe(deactivated_at);
    expect(species.id).toBe(first.register_code);
  });

  it("uses the species slug for profiles without an imported register code", async () => {
    const species = await speciesFromDb({ register_code: null });
    expect(species.profile?.speciesId).toBe("database-species");
  });

  it.each(["summary", "look_for", "checked_at"] as const)("omits the profile when %s is missing", async (field) => {
    expect((await speciesFromDb({ [field]: null })).profile).toBeNull();
  });

  it("uses edited canonical names and lists each Māori name once", async () => {
    const species = await speciesFromDb({
      scientific_name: "Updated botanical name", common_name: "Updated common name", maori_name: "Preferred Māori name",
      maori_name_alternatives: ["Preferred Māori name", "Alternative Māori name"],
    });
    expect(species.profile).toMatchObject({
      scientificName: species.scientificName, commonName: species.commonName,
      maoriNames: ["Preferred Māori name", "Alternative Māori name"],
    });
  });
});
