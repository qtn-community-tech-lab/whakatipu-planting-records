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
