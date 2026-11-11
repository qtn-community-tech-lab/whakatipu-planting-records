import { describe, expect, it } from "vitest";
import speciesProfiles from "@/data/species-profiles.json";
import { getSpeciesReferenceReview, speciesReferenceReviews } from "@/lib/wrt/species-reference-reviews";

describe("reviewed species profiles", () => {
  it("uses unique identities and keeps confirmed reviews linked to profiles", () => {
    expect(new Set(speciesProfiles.map((p) => p.speciesId)).size).toBe(speciesProfiles.length);
    for (const profile of speciesProfiles) {
      const review = getSpeciesReferenceReview(profile.speciesId);
      if (review) {
        expect(profile.scientificName).toBe(review.scientificName);
      }
    }
    for (const review of speciesReferenceReviews.filter((r) => r.status === "confirmed")) {
      expect(speciesProfiles.find((p) => p.speciesId === review.speciesId)).toBeDefined();
    }
  });

  it("retains attribution and makes gaps and shared names explicit", () => {
    for (const profile of speciesProfiles) {
      if (profile.commonName !== null) expect(profile.commonName.trim()).not.toBe("");
      expect(profile.summary.trim()).not.toBe("");
      expect(profile.lookFor.trim()).not.toBe("");
      expect(profile.sources.length).toBeGreaterThan(0);
      for (const source of profile.sources) {
        expect(source.label.trim()).not.toBe("");
        expect(new URL(source.url).protocol).toBe("https:");
      }
      expect(profile.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(speciesProfiles.find((profile) => profile.speciesId === "SP-116")?.maoriNames).toEqual([]);
    expect(speciesProfiles.find((profile) => profile.speciesId === "SP-026")?.nameNote).toContain("species-specific Māori name has not been confirmed");
    expect(speciesProfiles.find((profile) => profile.speciesId === "SP-152")?.nameNote).toContain("shared");
    expect(speciesProfiles.find((profile) => profile.speciesId === "SP-136")?.nameNote).toContain("possible name in southern districts");
    expect(speciesProfiles.find((profile) => profile.speciesId === "SP-079")?.nameNote).toContain("Whauwhau, which was not confirmed");
    expect(speciesProfiles.find((profile) => profile.speciesId === "SP-046")?.commonName).toBeNull();
    expect(speciesProfiles.find((profile) => profile.speciesId === "SP-109")?.nameNote).toContain("Shawia avicenniifolia");
    expect(speciesProfiles.find((profile) => profile.speciesId === "SP-113")?.nameNote).toContain("Shawia fragrantissima");
    expect(speciesProfiles.find((profile) => profile.speciesId === "SP-155")?.maoriNames).toEqual([]);
  });
});
