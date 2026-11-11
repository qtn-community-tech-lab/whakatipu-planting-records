import { describe, expect, it } from "vitest";
import { q, repo } from "./helpers";

describe("threatened marks (raised on About the data)", () => {
  it("keeps WRT's two lists separate and shows where they disagree", async () => {
    const { threatened } = await q.dataQuality();
    const po = threatened.filter((r) => r.item.threatenedMarks.plantsOutMaster);
    const te = threatened.filter((r) => r.item.threatenedMarks.teKakano);
    expect(po.map((r) => r.item.displayName).sort()).toEqual(["Kānuka", "Kōwhai"]);
    expect(te.map((r) => r.item.displayName).sort()).toEqual(["Kōwhai", "Mānuka"]);
    expect(threatened.filter((r) => r.agreed).map((r) => r.item.displayName)).toEqual(["Kōwhai"]);
    expect(threatened).toHaveLength(3);
  });

  it("flags mānuka as marked in Te Kakano only", async () => {
    const { threatened } = await q.dataQuality();
    const manuka = threatened.find((r) => r.item.scientificName === "Leptospermum scoparium");
    expect(manuka?.item.threatenedMarks).toEqual({ plantsOutMaster: false, teKakano: true });
    expect(manuka?.split.total).toBeGreaterThan(0);
  });

  it("keeps the plain threatened field equal to the Plants Out Master mark", async () => {
    const species = await repo.listSpecies();
    for (const s of species) expect(s.threatened === true).toBe(s.threatenedMarks.plantsOutMaster);
  });

  it("does not show the '#' marker inside alias spellings", async () => {
    const species = await repo.listSpecies();
    expect(species.flatMap((s) => s.aliases).filter((a) => a.startsWith("#"))).toEqual([]);
  });
});
