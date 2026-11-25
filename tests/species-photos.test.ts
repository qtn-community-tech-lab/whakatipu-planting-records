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
      expect(new Set(photos.map((p) => p.src)).size).toBe(photos.length);
    }
    const sectaSources = new Set(species.find((row) => row.scientific_name === "Carex secta")?.photos.map((p) => p.src));
    expect(species.find((row) => row.scientific_name === "Carex maorica")?.photos.every((p) => !sectaSources.has(p.src))).toBe(true);
  });
});
