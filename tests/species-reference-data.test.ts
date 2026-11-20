import { describe, expect, it } from "vitest";
import species from "@/data/species.json";

describe("species reference fields in the canonical seed", () => {
  it("uses unique canonical species identities", () => {
    expect(new Set(species.map((row) => row.register_code)).size).toBe(species.length);
    expect(new Set(species.map((row) => row.slug)).size).toBe(species.length);
  });

  it("keeps sourced identification fields complete and Māori names distinct", () => {
    for (const row of species) {
      if (row.common_name !== null) expect(row.common_name.trim()).not.toBe("");
      expect(row.summary?.trim()).toBeTruthy();
      expect(row.look_for?.trim()).toBeTruthy();
      expect(row.sources.length).toBeGreaterThan(0);
      for (const source of row.sources) {
        expect(source.label.trim()).not.toBe("");
        expect(new URL(source.url).protocol).toBe("https:");
      }
      expect(row.checked_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(row.maori_name_alternatives).not.toContain(row.maori_name);
      expect(new Set(row.maori_name_alternatives).size).toBe(row.maori_name_alternatives.length);
    }
    expect(species.find((row) => row.register_code === "SP-116")?.maori_name).toBeNull();
    expect(species.find((row) => row.register_code === "SP-046")?.common_name).toBeNull();
    expect(species.find((row) => row.register_code === "SP-086")?.maori_name).toBeNull();
  });
});
