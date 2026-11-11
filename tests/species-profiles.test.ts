import { describe, expect, it } from "vitest";
import speciesProfiles from "@/data/species-profiles.json";
import { topPlantedSpecies } from "@/lib/wrt/species-photos";
import { q } from "./helpers";
import { getSpeciesReferenceReview } from "@/lib/wrt/species-reference-reviews";

describe("reviewed species profiles", () => {
  it("covers researched species without attaching information to unconfirmed identities", async () => {
    const all = await q.speciesList();
    const top = topPlantedSpecies(all);
    expect(top.length).toBeGreaterThan(0);
    expect(top.reduce((sum, row) => sum + row.split.total, 0)).toBe((await q.overview()).split.total);
    expect(speciesProfiles.length).toBeGreaterThanOrEqual(75);
    expect(new Set(speciesProfiles.map((p) => p.speciesId)).size).toBe(speciesProfiles.length);
    expect(speciesProfiles.every((p) => top.some((r) => r.item.id === p.speciesId))).toBe(true);
    for (const row of top) {
      const profile = speciesProfiles.find((profile) => profile.speciesId === row.item.id);
      if (profile) expect(profile.scientificName).toBe(row.item.scientificName);
      else expect(getSpeciesReferenceReview(row.item.id)?.status).toBe("unresolved");
    }
    const maorica = all.find((r) => r.item.scientificName === "Carex maorica")!;
    expect(speciesProfiles.find((profile) => profile.speciesId === maorica.item.id)?.scientificName).toBe("Carex maorica");
    expect(speciesProfiles.find((profile) => profile.speciesId === "unknown")).toBeUndefined();
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
