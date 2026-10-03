import { describe, expect, it } from "vitest";
import { getSpeciesProfile, speciesProfiles, SPECIES_PROFILE_LIMIT } from "@/lib/wrt/species-profiles";
import { topPlantedSpecies } from "@/lib/wrt/species-photos";
import { q } from "./helpers";

describe("reviewed species profiles", () => {
  it("covers the current top thirty-five without attaching information to other taxa", async () => {
    const all = await q.speciesList();
    const top = topPlantedSpecies(all, SPECIES_PROFILE_LIMIT);
    expect(top).toHaveLength(35);
    expect(top.reduce((sum, row) => sum + row.split.total, 0)).toBe(125077);
    expect(speciesProfiles).toHaveLength(35);
    expect(new Set(speciesProfiles.map((p) => p.speciesId))).toEqual(new Set(top.map((r) => r.item.id)));
    for (const row of top) {
      expect(getSpeciesProfile(row.item.id)?.scientificName).toBe(row.item.scientificName);
    }
    const maorica = all.find((r) => r.item.scientificName === "Carex maorica")!;
    expect(getSpeciesProfile(maorica.item.id)).toBeUndefined();
    expect(getSpeciesProfile("unknown")).toBeUndefined();
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
    expect(getSpeciesProfile("SP-116")?.maoriNames).toEqual([]);
    expect(getSpeciesProfile("SP-026")?.nameNote).toContain("species-specific Māori name has not been confirmed");
    expect(getSpeciesProfile("SP-152")?.nameNote).toContain("shared");
    expect(getSpeciesProfile("SP-136")?.nameNote).toContain("possible name in southern districts");
    expect(getSpeciesProfile("SP-079")?.nameNote).toContain("Whauwhau, which was not confirmed");
    expect(getSpeciesProfile("SP-046")?.commonName).toBeNull();
  });
});
