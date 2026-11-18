import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readSpeciesSeed, speciesBackfillValues, speciesSeedRows, speciesSeedSchema } from "@/scripts/species/seed";
import { DEFAULT_DATA_DIR, loadFromDirectory } from "@/scripts/workbook/load";

const seed = readSpeciesSeed();

describe("CSV-derived species seed", () => {
  it("retains every original register identity without merging accepted names", () => {
    expect(seed).toHaveLength(164);
    expect(new Set(seed.map((entry) => entry.slug)).size).toBe(164);
    expect(seed.filter((entry) => entry.scientific_name === "Veronica cupressoides").map((entry) => entry.register_code)).toEqual(["SP-086", "SP-155"]);
  });

  it("corrects verified names while preserving historical slugs", () => {
    expect(seed.find((entry) => entry.register_code === "SP-014")).toMatchObject({
      scientific_name: "Carex flagellifera", slug: "carex-flagillera",
    });
    expect(seed.find((entry) => entry.register_code === "SP-164")).toMatchObject({
      scientific_name: "Pterophylla racemosa", slug: "weinmania-racemosa",
    });
  });

  it("distinguishes verified Threatened flags from unresolved matches and At Risk", () => {
    expect(seed.filter((entry) => entry.threatened === true)).toHaveLength(12);
    expect(seed.filter((entry) => entry.threatened === false)).toHaveLength(127);
    expect(seed.filter((entry) => entry.threatened === null)).toHaveLength(25);
    // The old spreadsheet mark was true; NZTCS lists this taxon as At Risk — Declining.
    expect(seed.find((entry) => entry.register_code === "SP-026")?.threatened).toBe(false);
  });

  it("rejects duplicate keys and extra assessment fields", () => {
    expect(speciesSeedSchema.safeParse([seed[0], seed[0]]).success).toBe(false);
    expect(speciesSeedSchema.safeParse([{ ...seed[0], nztcs_assessment: {} }]).success).toBe(false);
  });

  it("includes researched common and Māori names while leaving unresolved names blank", () => {
    expect(seed.filter((entry) => entry.common_name).length).toBe(140);
    expect(seed.filter((entry) => entry.maori_name).length).toBe(90);
    expect(seed.find((entry) => entry.register_code === "SP-004")).toMatchObject({ common_name: "Kauri", maori_name: "Kauri" });
    expect(seed.find((entry) => entry.register_code === "SP-101")).toMatchObject({ common_name: null, maori_name: null });
  });

  it("joins existing reference content by register code and limits backfill writes", () => {
    const rows = speciesSeedRows();
    expect(rows.find((entry) => entry.register_code === "SP-050")?.profile).toMatchObject({ speciesId: "SP-050" });
    expect(rows.find((entry) => entry.register_code === "SP-050")?.photos.length).toBeGreaterThan(0);
    const values = speciesBackfillValues(seed.find((entry) => entry.register_code === "SP-014")!);
    expect(values).toMatchObject({
      scientific_name: "Carex flagellifera", suggested_spelling: null, threatened: false,
    });
    expect(values).not.toHaveProperty("slug");
    expect(values).not.toHaveProperty("register_code");
    expect(values).not.toHaveProperty("register_note");
    expect(values).not.toHaveProperty("deactivated_at");
  });

  it("fills empty names and references while preserving existing editorial content", () => {
    const row = speciesSeedRows().find((entry) => entry.register_code === "SP-050")!;
    const empty = speciesBackfillValues(row, { common_name: " ", maori_name: null, profile: {}, photos: [] });
    expect(empty).toMatchObject({ common_name: row.common_name, maori_name: row.maori_name, profile: row.profile, photos: row.photos });

    const filled = speciesBackfillValues(row, {
      common_name: "Local nursery name", maori_name: "Local Māori name",
      profile: { summary: "Edited description" }, photos: [{ src: "https://example.com/edited.jpg", attribution: "Editor" }],
    });
    expect(filled).toEqual({ scientific_name: row.scientific_name, suggested_spelling: row.suggested_spelling, threatened: row.threatened });
    expect(speciesBackfillValues(row, { ...row, common_name: null, maori_name: null })).not.toHaveProperty("photos");
  });
});

describe.skipIf(!existsSync(`${DEFAULT_DATA_DIR}/species_master_proposed.csv`))("original CSV audit (when restored locally)", () => {
  it("retains all original register codes and slugs", () => {
    const original = loadFromDirectory(DEFAULT_DATA_DIR);
    expect(seed.map((entry) => [entry.register_code, entry.slug])).toEqual(original.species.map((entry) => [entry.id, entry.slug]));
  });
});
