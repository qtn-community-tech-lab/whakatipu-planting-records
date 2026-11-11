import { describe, expect, it } from "vitest";
import { topPlantedSpecies } from "@/lib/wrt/species-photos";
import speciesPhotos from "@/data/species-photos.json";
import { q } from "./helpers";
import { getSpeciesReferenceReview, speciesReferenceReviews } from "@/lib/wrt/species-reference-reviews";

describe("reviewed Wiki photo catalogue", () => {
  it("ranks recorded quantities and leaves unplanted species out", async () => {
    const rows = topPlantedSpecies(await q.speciesList());
    expect(rows.map((r) => [r.item.scientificName, r.split.total])).toEqual([
      ["Leptospermum scoparium", 125], ["Sophora microphylla", 100],
      ["Carex maorica", 60], ["Kunzea robusta", 50], ["Carex secta", 13],
      ["Austroderia richardii", 8], ["Olearia bullata", 7], ["Phormium tenax", 7],
    ]);
  });

  it("keeps photo sets consistent with their published identity reviews", () => {
    const ids = new Set([...speciesPhotos.map((p) => p.speciesId), ...speciesReferenceReviews.map((r) => r.speciesId)]);
    for (const id of ids) {
      const photos = speciesPhotos.filter((p) => p.speciesId === id);
      const review = getSpeciesReferenceReview(id);
      expect(photos).toHaveLength(review?.photoCount ?? 3);
      expect(new Set(photos.map((p) => p.sourceUrl)).size).toBe(photos.length);
      if (review) {
        expect(review.reason.trim()).not.toBe("");
        for (const photo of photos) expect(photo.scientificName).toBe(review.scientificName);
        if (review.status === "confirmed") expect(photos).toHaveLength(3);
        if (review.status === "unresolved") expect(photos).toHaveLength(0);
      }
    }
    const sectaSources = new Set(speciesPhotos.filter((p) => p.scientificName === "Carex secta").map((p) => p.sourceUrl));
    expect(speciesPhotos.filter((p) => p.scientificName === "Carex maorica").every((p) => !sectaSources.has(p.sourceUrl))).toBe(true);
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
