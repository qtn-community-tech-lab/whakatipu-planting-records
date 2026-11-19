import { describe, expect, it } from "vitest";
import { topPlantedSpecies } from "@/lib/wrt/species-photos";
import species from "@/data/species.json";
import { q } from "./helpers";

describe("species photo references", () => {
  it("ranks recorded quantities and leaves unplanted species out", async () => {
    const rows = topPlantedSpecies(await q.speciesList());
    expect(rows.map((r) => [r.item.scientificName, r.split.total])).toEqual([
      ["Leptospermum scoparium", 125], ["Sophora microphylla", 100],
      ["Carex maorica", 60], ["Kunzea robusta", 50], ["Carex secta", 13],
      ["Austroderia richardii", 8], ["Olearia bullata", 7], ["Phormium tenax", 7],
    ]);
  });

  it("keeps distinct photo sources without substituting a related species or forcing a photo quota", () => {
    for (const { photos } of species) {
      expect(new Set(photos.map((p) => p.sourceUrl)).size).toBe(photos.length);
    }
    expect(species.find((row) => row.register_code === "SP-154")?.photos).toHaveLength(1);
    const sectaSources = new Set(species.find((row) => row.scientific_name === "Carex secta")?.photos.map((p) => p.sourceUrl));
    expect(species.find((row) => row.scientific_name === "Carex maorica")?.photos.every((p) => !sectaSources.has(p.sourceUrl))).toBe(true);
  });

  it("keeps hosted image URLs, attribution and source licences in the seed", () => {
    const photos = species.flatMap((row) => row.photos);
    expect(photos.length).toBeGreaterThanOrEqual(150);
    expect(photos.length).toBeLessThanOrEqual(285);
    for (const photo of photos) {
      const url = new URL(photo.src);
      expect(url.protocol).toBe("https:");
      expect(["upload.wikimedia.org", "thumb.wikimedia.org", "inaturalist-open-data.s3.amazonaws.com"]).toContain(url.hostname);
      expect(new URL(photo.sourceUrl).protocol).toBe("https:");
      expect(new URL(photo.licenseUrl).protocol).toBe("https:");
      expect(photo.attribution.trim()).not.toBe("");
    }
  });
});
