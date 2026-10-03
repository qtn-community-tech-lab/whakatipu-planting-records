import { describe, expect, it } from "vitest";
import { getSpeciesPhoto, getSpeciesPhotos, speciesPhotos, topPlantedSpecies } from "@/lib/wrt/species-photos";
import { q } from "./helpers";

describe("reviewed Wiki photo catalogue", () => {
  it("covers precisely the fifty species with the most recorded plants", async () => {
    const rows = topPlantedSpecies(await q.speciesList());
    expect(rows).toHaveLength(50);
    expect(rows.reduce((sum, row) => sum + row.split.total, 0)).toBe(134846);
    expect(new Set(speciesPhotos.map((p) => p.speciesId))).toEqual(new Set(rows.map((r) => r.item.id)));
    for (const row of rows) {
      const photos = getSpeciesPhotos(row.item.id);
      expect(photos).toHaveLength(3);
      expect(new Set(photos.map((p) => p.sourceUrl)).size).toBe(3);
      for (const photo of photos) expect(photo.scientificName).toBe(row.item.scientificName);
    }
    // A photo for the contested Carex secta does not attach itself to Carex maorica.
    const maorica = (await q.speciesList()).find((r) => r.item.scientificName === "Carex maorica")!;
    expect(getSpeciesPhoto(maorica.item.id)).toBeUndefined();
    expect(getSpeciesPhoto("unknown")).toBeUndefined();
  });

  it("keeps hosted image URLs, author credits and source licences for future offline use", () => {
    expect(speciesPhotos).toHaveLength(150);
    expect(new Set(speciesPhotos.map((p) => p.src)).size).toBe(150);
    for (const photo of speciesPhotos) {
      const url = new URL(photo.src);
      expect(url.protocol).toBe("https:");
      expect(["upload.wikimedia.org", "thumb.wikimedia.org", "inaturalist-open-data.s3.amazonaws.com"]).toContain(url.hostname);
      expect(photo.width).toBeGreaterThan(0);
      expect(photo.height).toBeGreaterThan(0);
      expect(photo.author.length).toBeGreaterThan(0);
      expect(photo.caption).toContain(photo.scientificName);
      if (photo.sourceName === "Wikimedia Commons") {
        expect(new URL(photo.sourceUrl).hostname).toBe("commons.wikimedia.org");
      } else {
        expect(photo.sourceName).toBe("iNaturalist");
        expect(photo.scientificName).toBe("Olearia hectorii");
        expect(new URL(photo.sourceUrl).hostname).toBe("www.inaturalist.org");
        expect(photo.observationUrl).toBe("https://www.inaturalist.org/observations/60402502");
        expect(photo.author).toBe("John Barkla");
        expect(photo.license).toBe("CC BY 4.0");
      }
      if (photo.scientificName === "Veronica cupressoides") {
        expect(photo.articleUrl).toBe("https://www.nzpcn.org.nz/flora/species/veronica-cupressoides/");
        expect(photo.articleLabel).toBe("NZPCN species page");
      } else {
        expect(new URL(photo.articleUrl).hostname).toBe("en.wikipedia.org");
      }
      expect(new URL(photo.licenseUrl).protocol).toBe("https:");
      expect(["CC BY 4.0", "CC BY-SA 4.0", "CC BY-SA 3.0", "CC BY-SA 2.0", "CC0", "Public domain"]).toContain(photo.license);
    }
  });
});
