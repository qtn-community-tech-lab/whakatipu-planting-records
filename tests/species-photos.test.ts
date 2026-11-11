import { describe, expect, it } from "vitest";
import { topPlantedSpecies } from "@/lib/wrt/species-photos";
import speciesPhotos from "@/data/species-photos.json";
import { q } from "./helpers";
import { getSpeciesReferenceReview, speciesReferenceReviews } from "@/lib/wrt/species-reference-reviews";

describe("reviewed Wiki photo catalogue", () => {
  it("covers the planting history with explicit outcomes for incomplete reference sets", async () => {
    const rows = topPlantedSpecies(await q.speciesList()).slice(0, 95);
    expect(rows).toHaveLength(95);
    expect(rows.reduce((sum, row) => sum + row.split.total, 0)).toBe(140068);
    expect(new Set(speciesReferenceReviews.map((r) => r.speciesId))).toEqual(new Set(rows.slice(50).map((r) => r.item.id)));
    for (const [index, row] of rows.entries()) {
      const photos = speciesPhotos.filter((photo) => photo.speciesId === row.item.id);
      if (index < 50) expect(photos).toHaveLength(3);
      else {
        const review = getSpeciesReferenceReview(row.item.id)!;
        expect(photos).toHaveLength(review.photoCount);
        expect(review.reason.trim()).not.toBe("");
        if (review.status === "confirmed") expect(photos).toHaveLength(3);
        if (review.status === "unresolved") expect(photos).toHaveLength(0);
      }
      expect(photos.length).toBeLessThanOrEqual(3);
      expect(new Set(photos.map((p) => p.sourceUrl)).size).toBe(photos.length);
      for (const photo of photos) expect(photo.scientificName).toBe(row.item.scientificName);
    }
    // These disputed WRT entries are different biological species in the checked sources.
    const maorica = (await q.speciesList()).find((r) => r.item.scientificName === "Carex maorica")!;
    const secta = (await q.speciesList()).find((r) => r.item.scientificName === "Carex secta")!;
    const sectaSources = new Set(speciesPhotos.filter((photo) => photo.speciesId === secta.item.id).map((p) => p.sourceUrl));
    expect(speciesPhotos.filter((photo) => photo.speciesId === maorica.item.id).every((p) => !sectaSources.has(p.sourceUrl))).toBe(true);
    expect(speciesPhotos.every((photo) => rows.some((row) => row.item.id === photo.speciesId))).toBe(true);
    expect(speciesPhotos.find((photo) => photo.speciesId === "unknown")).toBeUndefined();
  });

  it("keeps hosted image URLs, author credits and source licences for future offline use", () => {
    expect(speciesPhotos.length).toBeGreaterThanOrEqual(150);
    expect(speciesPhotos.length).toBeLessThanOrEqual(285);
    for (const photo of speciesPhotos) {
      const url = new URL(photo.src);
      expect(url.protocol).toBe("https:");
      expect(["upload.wikimedia.org", "thumb.wikimedia.org", "inaturalist-open-data.s3.amazonaws.com"]).toContain(url.hostname);
      expect(photo.width).toBeGreaterThan(0);
      expect(photo.height).toBeGreaterThan(0);
      expect(photo.author.length).toBeGreaterThan(0);
      expect(photo.caption.trim()).not.toBe("");
      if (photo.sourceName === "Wikimedia Commons") {
        expect(new URL(photo.sourceUrl).hostname).toBe("commons.wikimedia.org");
      } else {
        expect(photo.sourceName).toBe("iNaturalist");
        expect(new URL(photo.sourceUrl).hostname).toBe("www.inaturalist.org");
        expect(new URL(photo.observationUrl!).hostname).toBe("www.inaturalist.org");
      }
      if (photo.scientificName === "Veronica cupressoides") {
        expect(photo.articleUrl).toBe("https://www.nzpcn.org.nz/flora/species/veronica-cupressoides/");
        expect(photo.articleLabel).toBe("NZPCN species page");
      } else {
        expect(["en.wikipedia.org", "www.nzpcn.org.nz", "www.nzflora.info"]).toContain(new URL(photo.articleUrl).hostname);
      }
      expect(new URL(photo.licenseUrl).protocol).toBe("https:");
      expect(["CC BY 4.0", "CC BY 3.0", "CC BY 2.0", "CC BY-SA 4.0", "CC BY-SA 3.0", "CC BY-SA 2.0", "CC0", "Public domain"]).toContain(photo.license);
    }
  });
});
