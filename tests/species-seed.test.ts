import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readSpeciesSeed, speciesBackfillValues, speciesSeedSchema } from "@/scripts/species/seed";
import { DEFAULT_DATA_DIR } from "@/scripts/workbook/load";
import { parseCsv } from "@/scripts/workbook/parse";
import { cleanLabel, slugify } from "@/lib/wrt/text";
import { INPUT_LIMITS } from "@/lib/forms/limits";
import catalogue from "@/data/species.json";

const seed = readSpeciesSeed();
const emptyReferences = { maori_name_alternatives: [], summary: null, look_for: null, sources: [], checked_at: null };

describe("complete PostgreSQL species seed", () => {
  it("uses complete species.json rows without replacing their saved content", () => {
    expect(seed).toEqual(catalogue);
    expect(seed.filter((entry) => entry.summary !== null)).toHaveLength(93);
    expect(seed.every((entry) => Object.keys(entry).every((key) => !key.startsWith("profile_") && key !== "name_note"))).toBe(true);
  });

  it("retains 93 planted species after the confirmed C1 and C2 merges", () => {
    expect(seed).toHaveLength(93);
    expect(new Set(seed.map((entry) => entry.slug)).size).toBe(93);
    for (const [code, name] of [["SP-086", "Leonohebe cupressoides"], ["SP-087", "Leptecophylla juniperina"]]) {
      expect(seed.find((entry) => entry.register_code === code)).toMatchObject({
        scientific_name: name, needs_decision: false, contested_group: null,
      });
    }
    expect(seed.some((entry) => ["SP-060", "SP-155"].includes(entry.register_code!))).toBe(false);
  });

  it("corrects verified names while preserving historical slugs", () => {
    expect(seed.find((entry) => entry.register_code === "SP-124")).toMatchObject({
      scientific_name: "Parsonsia heterophylla", slug: "parsonia-heterophylla",
    });
    expect(seed.find((entry) => entry.register_code === "SP-164")).toMatchObject({
      scientific_name: "Pterophylla racemosa", slug: "weinmania-racemosa",
    });
  });

  it("distinguishes verified Threatened flags from unresolved matches and At Risk", () => {
    expect(seed.filter((entry) => entry.threatened === true)).toHaveLength(3);
    expect(seed.filter((entry) => entry.threatened === false)).toHaveLength(80);
    expect(seed.filter((entry) => entry.threatened === null)).toHaveLength(10);
    // At Risk is distinct from Threatened.
    expect(seed.find((entry) => entry.register_code === "SP-147")?.threatened).toBe(false);
  });

  it("rejects duplicate keys and extra assessment fields", () => {
    expect(speciesSeedSchema.safeParse([seed[0], seed[0]]).success).toBe(false);
    expect(speciesSeedSchema.safeParse([{ ...seed[0], nztcs_assessment: {} }]).success).toBe(false);
  });

  it("requires complete reference fields and excludes database-managed audit fields", () => {
    const { summary, ...incomplete } = seed[0]!;
    void summary;
    expect(speciesSeedSchema.safeParse([incomplete]).success).toBe(false);
    expect(speciesSeedSchema.safeParse([{ ...seed[0], created_by: "spoofed" }]).success).toBe(false);
  });

  it("allows app-created species without register codes", () => {
    expect(speciesSeedSchema.safeParse(seed.slice(0, 2).map((entry) => ({ ...entry, register_code: null }))).success).toBe(true);
  });

  it.each([
    ["scientific_name", INPUT_LIMITS.shortText],
    ["common_name", INPUT_LIMITS.shortText],
    ["summary", INPUT_LIMITS.longText],
    ["look_for", INPUT_LIMITS.longText],
  ] as const)("bounds %s at %i characters", (field, limit) => {
    expect(speciesSeedSchema.safeParse([{ ...seed[0], [field]: "a".repeat(limit) }]).success).toBe(true);
    expect(speciesSeedSchema.safeParse([{ ...seed[0], [field]: "a".repeat(limit + 1) }]).success).toBe(false);
  });

  it("rejects invalid reference dates and overlong source and photo fields", () => {
    expect(speciesSeedSchema.safeParse([{ ...seed[0], checked_at: "2026-02-30" }]).success).toBe(false);
    for (const size of [INPUT_LIMITS.shortText, INPUT_LIMITS.shortText + 1]) {
      const entry = {
        ...seed[0],
        maori_name_alternatives: ["a".repeat(size)],
        sources: [{ label: "a".repeat(size), url: "https://example.com" }],
        photos: [{ src: "https://example.com/photo.jpg", attribution: "a".repeat(size) }],
      };
      expect(speciesSeedSchema.safeParse([entry]).success).toBe(size === INPUT_LIMITS.shortText);
    }
    for (const size of [INPUT_LIMITS.url, INPUT_LIMITS.url + 1]) {
      const url = `https://example.com/${"a".repeat(size - "https://example.com/".length)}`;
      expect(speciesSeedSchema.safeParse([{
        ...seed[0], sources: [{ label: "Source", url }],
        photos: [{ src: url, attribution: "Photo", sourceUrl: url, licenseUrl: url }],
      }]).success).toBe(size === INPUT_LIMITS.url);
    }
  });

  it("includes researched common and Māori names while leaving unresolved names blank", () => {
    expect(seed.filter((entry) => entry.common_name).length).toBe(89);
    expect(seed.filter((entry) => entry.maori_name).length).toBe(66);
    expect(seed.find((entry) => entry.register_code === "SP-088")).toMatchObject({ common_name: "Mānuka", maori_name: "Mānuka" });
    expect(seed.find((entry) => entry.register_code === "SP-041")).toMatchObject({ common_name: null, maori_name: null });
  });

  it("retains existing reference content and limits backfill writes", () => {
    const rows = readSpeciesSeed();
    const saved = rows.find((entry) => entry.register_code === "SP-050")!;
    expect(saved.summary).toBeTruthy();
    expect(saved.look_for).toBeTruthy();
    expect(saved.sources.length).toBeGreaterThan(0);
    expect(rows.every((entry) => !("profile" in entry))).toBe(true);
    expect(rows.some((entry) => entry.register_code === "SP-101")).toBe(false);
    expect(rows.find((entry) => entry.register_code === "SP-050")?.photos.length).toBeGreaterThan(0);
    const values = speciesBackfillValues(seed.find((entry) => entry.register_code === "SP-124")!);
    expect(values).toMatchObject({
      scientific_name: "Parsonsia heterophylla", suggested_spelling: null, threatened: false,
    });
    expect(values).not.toHaveProperty("slug");
    expect(values).not.toHaveProperty("register_code");
    expect(values).not.toHaveProperty("register_note");
    expect(values).not.toHaveProperty("deactivated_at");
  });

  it("rejects Māori alternatives that repeat the preferred name or another alternative", () => {
    expect(speciesSeedSchema.safeParse([{ ...seed[0], maori_name: "Preferred", maori_name_alternatives: ["Preferred"] }]).success).toBe(false);
    expect(speciesSeedSchema.safeParse([{ ...seed[0], maori_name_alternatives: ["Alternative", "Alternative"] }]).success).toBe(false);
  });

  it.each([
    ["SP-086", "leonohebe-cupressoides", "Leonohebe cupressoides"],
    ["SP-103", "muehlenbeckia-complexa", "Muehlenbeckia complexa"],
    ["SP-117", "olearia-nummularifolia", "Olearia nummulariifolia"],
    ["SP-124", "parsonia-heterophylla", "Parsonsia heterophylla"],
    ["SP-142", "prumnopitys-taxifolius", "Prumnopitys taxifolia"],
    ["SP-150", "scheflera-digitata", "Schefflera digitata"],
    ["SP-164", "weinmania-racemosa", "Pterophylla racemosa"],
  ])("resolves botanical naming for %s without changing its historical slug", (register_code, slug, name) => {
    expect(seed.find((entry) => entry.register_code === register_code)).toMatchObject({
      slug, scientific_name: name,
    });
  });

  it("keeps familiar local names and retains documented alternatives", () => {
    for (const [code, name] of [["SP-050", "Mingimingi"], ["SP-088", "Mānuka"], ["SP-142", "Mataī"], ["SP-147", "Fierce lancewood"]]) {
      expect(seed.find((entry) => entry.register_code === code)).toMatchObject({ common_name: name });
    }
    expect(seed.find((entry) => entry.register_code === "SP-054")).toMatchObject({
      common_name: "Round-leaved coprosma",
    });
    for (const code of ["SP-041", "SP-046"]) expect(seed.find((entry) => entry.register_code === code)?.common_name).toBeNull();
  });

  it("corrects unsupported Māori names and spelling while preserving sourced alternatives", () => {
    for (const [code, name] of [["SP-034", "Wī kura"], ["SP-069", "Tāwhairauriki"], ["SP-070", "Tāwhairaunui"], ["SP-079", "Houhere"], ["SP-092", "Tāwhairauriki"], ["SP-104", "Māpau"], ["SP-150", "Patatē"]]) {
      expect(seed.find((entry) => entry.register_code === code)?.maori_name).toBe(name);
    }
    expect(seed.find((entry) => entry.register_code === "SP-150")?.maori_name_alternatives).toEqual(["Patē"]);
  });

  it("fills empty names and references while preserving existing editorial content", () => {
    const row = readSpeciesSeed().find((entry) => entry.register_code === "SP-050")!;
    const empty = speciesBackfillValues(row, { common_name: " ", maori_name: null, ...emptyReferences, photos: [] });
    expect(empty).toMatchObject({
      common_name: row.common_name, maori_name: row.maori_name,
      summary: row.summary, sources: row.sources, photos: row.photos,
    });

    const filled = speciesBackfillValues(row, {
      common_name: "Local nursery name", maori_name: "Local Māori name",
      summary: "Edited description", photos: [{ src: "https://example.com/edited.jpg", attribution: "Editor" }],
    });
    expect(filled).toEqual({ scientific_name: row.scientific_name, suggested_spelling: row.suggested_spelling, threatened: row.threatened });
    expect(speciesBackfillValues(row, { ...row, common_name: null, maori_name: null })).not.toHaveProperty("photos");
  });

  it.each([
    { maori_name_alternatives: ["Local name"] },
    { sources: [{ label: "Local source", url: "https://example.com" }] },
    { checked_at: "2026-11-19" },
  ])("preserves partially populated profile content: %j", (current) => {
    const row = readSpeciesSeed().find((entry) => entry.register_code === "SP-050")!;
    const values = speciesBackfillValues(row, { ...emptyReferences, ...current });
    for (const key of Object.keys(emptyReferences)) expect(values).not.toHaveProperty(key);
  });
});

describe.skipIf(!existsSync(`${DEFAULT_DATA_DIR}/species_master_proposed.csv`) || !existsSync(`${DEFAULT_DATA_DIR}/planting_history.csv`))("original CSV audit (when restored locally)", () => {
  it("retains the historical species identities after applying the confirmed merges", () => {
    const original = parseCsv(readFileSync(`${DEFAULT_DATA_DIR}/species_master_proposed.csv`, "utf8"));
    const history = parseCsv(readFileSync(`${DEFAULT_DATA_DIR}/planting_history.csv`, "utf8"));
    const mergedCodes = new Map([["SP-060", "SP-087"], ["SP-155", "SP-086"]]);
    const planted = new Set(history.rows.map((row) => mergedCodes.get(row.species_id_proposed ?? "") ?? row.species_id_proposed));
    expect(new Set(seed.map((entry) => entry.register_code))).toEqual(planted);
    const usedSlugs = new Set<string>();
    const identities = original.rows.filter((row) => row.species_id).map((row) => {
      let slug = slugify(cleanLabel(row.canonical_handle ?? "")) || slugify(row.species_id!);
      if (usedSlugs.has(slug)) slug = `${slug}-${slugify(row.species_id!)}`;
      usedSlugs.add(slug);
      return [row.species_id, slug];
    });
    expect(seed.map((entry) => [entry.register_code, entry.slug])).toEqual(identities.filter(([code]) => planted.has(code)));
  });
});
