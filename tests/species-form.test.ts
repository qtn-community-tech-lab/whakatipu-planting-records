import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SpeciesForm, emptySpecies, speciesFormSchema, speciesFormValues, speciesWriteValues } from "@/components/wrt/species/SpeciesForm";
import { speciesSchema } from "@/db/types";
import { INPUT_LIMITS, lengthMessage } from "@/lib/forms/limits";

const valid = () => ({ ...emptySpecies, slug: "coprosma-propinqua", scientific_name: "Coprosma propinqua" });

describe("species form", () => {
  const textCases = [
    { field: "slug", limit: INPUT_LIMITS.identifier, prefix: "" },
    { field: "scientific_name", limit: INPUT_LIMITS.shortText, prefix: "" },
    { field: "suggested_spelling", limit: INPUT_LIMITS.shortText, prefix: "" },
    { field: "common_name", limit: INPUT_LIMITS.shortText, prefix: "" },
    { field: "maori_name", limit: INPUT_LIMITS.shortText, prefix: "" },
    { field: "contested_group", limit: INPUT_LIMITS.identifier, prefix: "C" },
    { field: "register_note", limit: INPUT_LIMITS.longText, prefix: "" },
  ] as const;

  it.each(textCases)("enforces the $field length in both form and server validation", ({ field, limit, prefix }) => {
    const exact = prefix + (prefix ? "1" : "a").repeat(limit - prefix.length);
    const input = { ...valid(), [field]: exact };
    expect(speciesFormSchema.safeParse(input).success).toBe(true);
    expect(speciesSchema.safeParse(speciesWriteValues(input)).success).toBe(true);

    const overlong = { ...input, [field]: exact + "1" };
    for (const result of [speciesFormSchema.safeParse(overlong), speciesSchema.safeParse(speciesWriteValues(overlong))]) {
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues).toContainEqual(expect.objectContaining({
        path: [field], message: lengthMessage(limit),
      }));
    }
  });

  it.each([
    { field: "src", limit: INPUT_LIMITS.url, prefix: "https://example.com/" },
    { field: "attribution", limit: INPUT_LIMITS.shortText, prefix: "" },
  ] as const)("enforces photo $field lengths in both schemas", ({ field, limit, prefix }) => {
    const exact = prefix + "a".repeat(limit - prefix.length);
    const photo = { src: "https://example.com/plant.jpg", attribution: "Credit", [field]: exact };
    const input = { ...valid(), photos: [photo] };
    expect(speciesFormSchema.safeParse(input).success).toBe(true);
    expect(speciesSchema.safeParse(speciesWriteValues(input)).success).toBe(true);

    const overlong = { ...input, photos: [{ ...photo, [field]: exact + "a" }] };
    for (const result of [speciesFormSchema.safeParse(overlong), speciesSchema.safeParse(speciesWriteValues(overlong))]) {
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues).toContainEqual(expect.objectContaining({
        path: ["photos", 0, field], message: lengthMessage(limit),
      }));
    }
  });

  it("matches HTML length limits to the validation limits", () => {
    const html = renderToStaticMarkup(createElement(SpeciesForm, {
      onSubmit: async () => {},
      values: {
        ...speciesWriteValues(valid()), updated_at: "2026-11-07T00:00:00Z",
        photos: [{ src: "https://example.com/plant.jpg", attribution: "Credit" }],
      },
    }));
    const controls = html.match(/<(?:input|textarea)\b[^>]*>/g) ?? [];
    for (const { field, limit } of [
      ...textCases,
      { field: "photos.0.src", limit: INPUT_LIMITS.url },
      { field: "photos.0.attribution", limit: INPUT_LIMITS.shortText },
    ]) {
      const control = controls.find((tag) => tag.includes(`name="${field}"`));
      expect(control).toBeDefined();
      expect(control?.toLowerCase()).toContain(`maxlength="${limit}"`);
    }
  });

  it("only allows entering a slug when creating a species", () => {
    const onSubmit = async () => {};
    const created = renderToStaticMarkup(createElement(SpeciesForm, { onSubmit }));
    const existing = renderToStaticMarkup(createElement(SpeciesForm, {
      onSubmit,
      values: { ...speciesWriteValues(valid()), updated_at: "2026-11-07T00:00:00Z" },
    }));
    const slugInput = (markup: string) => markup.match(/<input\b[^>]*name="slug"[^>]*>/)?.[0];
    expect(slugInput(created)).toBeDefined();
    expect(slugInput(created)).not.toMatch(/readonly/i);
    expect(slugInput(existing)).toMatch(/readonly/i);
    expect(slugInput(existing)).toContain('value="coprosma-propinqua"');
    expect(existing).toContain("The slug cannot be changed after the species is created.");
  });

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
    expect(species.status).toBe("core");
    expect(species.threatened).toBe(false);
    expect(species.threatened_te_kakano).toBe(false);
    expect(species.maori_name).toBe("Mānuka");
    expect(speciesWriteValues({ ...valid(), needs_decision: true }).needs_decision).toBe(false);
  });

  it.each(["", "Some Plant", "a--b", "-plant", "plant-", "new", "photos"])("rejects invalid or reserved slug %j", (slug) => {
    expect(speciesFormSchema.safeParse({ ...valid(), slug }).success).toBe(false);
  });

  it("validates image URLs", () => {
    const result = speciesFormSchema.safeParse({ ...valid(), photos: [{ src: "javascript:alert(1)", attribution: "" }] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]!.path).toEqual(["photos", 0, "src"]);
  });

  it("normalizes supplied URLs, names and unknown flags", () => {
    const values = speciesFormSchema.parse({
      ...valid(), threatened: "unknown", photos: [{ src: "https://example.com/new.jpg", attribution: "New photographer · CC BY" }, { src: "https://example.com/old.jpg", attribution: "Old photographer · CC BY-SA" }],
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
    const saved = { ...speciesWriteValues(input), needs_decision: true, updated_at: "2026-11-07T00:00:00Z" };
    expect(speciesWriteValues(speciesFormValues(saved))).toEqual(speciesWriteValues(input));
    expect(speciesWriteValues({ ...input, photos: [] })).toHaveProperty("photos", []);
  });

  it("accepts only the core writable columns", () => {
    const species = speciesSchema.parse({ ...speciesWriteValues(valid()), profile: { summary: "Ignored" }, updated_at: "Ignored" });
    expect(species).not.toHaveProperty("profile");
    expect(species).not.toHaveProperty("updated_at");
  });
});
