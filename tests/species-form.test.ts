import { describe, expect, it } from "vitest";
import { emptySpecies, speciesFormSchema, speciesFormValues, speciesWriteValues } from "@/components/wrt/species/SpeciesForm";
import { speciesSchema } from "@/db/types";

const valid = () => ({ ...emptySpecies, slug: "coprosma-propinqua", scientific_name: "Coprosma propinqua" });

describe("species form", () => {
  it("keeps the admin's slug and allows optional fields", () => {
    const values = speciesFormSchema.parse({ ...valid(), slug: "my-own-slug", maori_name: "  Mānuka  " });
    expect(values.slug).toBe("my-own-slug");
    expect(values.maori_name).toBe("Mānuka");
    expect(values.photos).toEqual([]);
  });

  it("produces a normalized species for the page's submit handler", () => {
    const species = speciesWriteValues({ ...valid(), over_5m: "yes", maori_name: "Mānuka" });
    expect(speciesSchema.parse(species)).toEqual(species);
    expect(species.over_5m).toBe(true);
    expect(species.threatened).toBeNull();
    expect(species.maori_name).toBe("Mānuka");
  });

  it.each(["", "Some Plant", "a--b", "-plant", "plant-", "new", "photos"])("rejects invalid or reserved slug %j", (slug) => {
    expect(speciesFormSchema.safeParse({ ...valid(), slug }).success).toBe(false);
  });

  it("validates image URLs", () => {
    const result = speciesFormSchema.safeParse({ ...valid(), photos: [{ src: "javascript:alert(1)", attribution: "" }] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["photos", 0, "src"]);
  });

  it("normalizes supplied URLs, names and unknown flags", () => {
    const values = speciesFormSchema.parse({
      ...valid(), photos: [{ src: "https://example.com/new.jpg", attribution: "New photographer · CC BY" }, { src: "https://example.com/old.jpg", attribution: "Old photographer · CC BY-SA" }],
    });
    const row = speciesWriteValues(values);
    expect(row.photos).toEqual([{ src: "https://example.com/new.jpg", attribution: "New photographer · CC BY" }, { src: "https://example.com/old.jpg", attribution: "Old photographer · CC BY-SA" }]);
    expect(row.over_5m).toBeNull();
    expect(row.threatened).toBeNull();
    expect(row.common_name).toBeNull();
    expect(row).not.toHaveProperty("register_code");
    expect(row).not.toHaveProperty("updated_by");
  });

  it("round-trips saved content and allows images to be cleared", () => {
    const input = speciesFormSchema.parse({
      ...valid(), over_5m: "no", threatened: "yes", status: "appended", common_name: "Mingimingi",
      photos: [{ src: "https://example.com/plant.jpg", attribution: "Photographer · CC BY" }],
    });
    const saved = { ...speciesWriteValues(input), updated_at: "2026-11-07T00:00:00Z" };
    expect(speciesFormValues(saved)).toEqual(input);
    expect(speciesWriteValues({ ...input, photos: [] })).toHaveProperty("photos", []);
  });

  it("accepts only the core writable columns", () => {
    const species = speciesSchema.parse({ ...speciesWriteValues(valid()), profile: { summary: "Ignored" }, updated_at: "Ignored" });
    expect(species).not.toHaveProperty("profile");
    expect(species).not.toHaveProperty("updated_at");
  });
});
