import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { SpeciesProfile } from "@/lib/wrt/species-profiles";
import speciesProfiles from "@/data/species-profiles.json";
import type { SpeciesPhoto } from "@/lib/wrt/species-photos";
import speciesPhotos from "@/data/species-photos.json";
import { getSpeciesReferenceReview } from "@/lib/wrt/species-reference-reviews";

interface ResearchEntry {
  rank: number;
  speciesId: string;
  scientificName: string;
  profile: SpeciesProfile | null;
  photos: SpeciesPhoto[];
  identityEvidence: { url: string; note: string }[];
  photoEvidence: { sourceUrl: string; viewed: boolean; visualCheck: string; author: string; license: string }[];
  searchedSources: string[];
}

describe("five-species reference research batches", () => {
  it("retains viewed image evidence and source checks for all 45 additional entries", () => {
    const entries: ResearchEntry[] = [];
    for (let batch = 1; batch <= 9; batch++) {
      const file = path.join(process.cwd(), "data", "research", "species-research", `batch-${String(batch).padStart(2, "0")}.json`);
      const data = JSON.parse(readFileSync(file, "utf8")) as { entries: ResearchEntry[] };
      expect(data.entries).toHaveLength(5);
      entries.push(...data.entries);
    }
    expect(new Set(entries.map((e) => e.speciesId)).size).toBe(45);
    expect(entries.map((e) => e.rank).sort((a, b) => a - b)).toEqual(Array.from({ length: 45 }, (_, i) => i + 51));
    for (const entry of entries) {
      expect(entry.identityEvidence.length).toBeGreaterThan(0);
      expect(entry.searchedSources.length).toBeGreaterThan(0);
      for (const source of entry.identityEvidence) expect(new URL(source.url).protocol).toBe("https:");
      const review = getSpeciesReferenceReview(entry.speciesId)!;
      expect(review.scientificName).toBe(entry.scientificName);
      expect(speciesProfiles.find((profile) => profile.speciesId === entry.speciesId)).toEqual(entry.profile ?? undefined);
      const published = speciesPhotos.filter((photo) => photo.speciesId === entry.speciesId);
      expect(published).toEqual(entry.photos);
      for (const photo of published) {
        const evidence = entry.photoEvidence.find((e) => e.sourceUrl === photo.sourceUrl)!;
        expect(evidence).toBeDefined();
        expect(evidence.viewed).toBe(true);
        expect(evidence.visualCheck.trim()).not.toBe("");
        expect(evidence.author).toBe(photo.author);
        expect(evidence.license).toBe(photo.license);
      }
    }
  });
});
