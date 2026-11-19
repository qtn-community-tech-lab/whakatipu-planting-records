import { describe, expect, it } from "vitest";
import species from "@/data/species.json";
import { getSpeciesReferenceReview, speciesReferenceReviews } from "@/lib/wrt/species-reference-reviews";

describe("species reference fields in the canonical seed", () => {
  it("uses unique species identities and links reviewed identities to seed rows", () => {
    expect(new Set(species.map((row) => row.register_code)).size).toBe(species.length);
    for (const review of speciesReferenceReviews) {
      const row = species.find((candidate) => candidate.register_code === review.speciesId);
      expect(row).toBeDefined();
    }
    for (const row of species) {
      const review = getSpeciesReferenceReview(row.register_code!);
      if (review) expect(row.scientific_name).toBe(review.scientificName);
    }
  });

  it("keeps sourced identification fields complete and Māori names distinct", () => {
    for (const row of species) {
      if (row.common_name !== null) expect(row.common_name.trim()).not.toBe("");
      expect(row.summary?.trim()).not.toBe("");
      expect(row.look_for?.trim()).not.toBe("");
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
    expect(species.find((row) => row.register_code === "SP-155")?.maori_name).toBeNull();
  });
});
