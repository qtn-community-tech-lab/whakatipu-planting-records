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
    { field: "summary", limit: INPUT_LIMITS.longText, prefix: "" },
    { field: "look_for", limit: INPUT_LIMITS.longText, prefix: "" },
    { field: "contested_group", limit: INPUT_LIMITS.identifier, prefix: "C" },
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

  it("matches HTML length limits to the validation limits", () => {
    const html = renderToStaticMarkup(createElement(SpeciesForm, {
      onSubmit: async () => {},
      values: {
        ...speciesWriteValues(valid()), updated_at: "2026-11-07T00:00:00Z",
        maori_name_alternatives: ["Mingimingi"],
        photos: [{ src: "https://example.com/plant.jpg", attribution: "Credit" }],
      },
    }));
    expect(html).not.toContain("Register notes");
    expect(html).not.toContain('name="register_note"');
    expect(html).not.toContain("Register status");
    expect(html).not.toContain('name="status"');
    const controls = html.match(/<(?:input|textarea)\b[^>]*>/g) ?? [];
    for (const { field, limit } of [
      ...textCases.filter(({ field }) => field !== "contested_group"),
      { field: "maori_name_alternatives.0.name", limit: INPUT_LIMITS.shortText },
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
    expect(existing).toContain("It can&#x27;t be changed after the species is created.");
  });

  it("validates alternative Māori names in both form and server schemas", () => {
    const exact = "ā".repeat(INPUT_LIMITS.shortText);
    const input = { ...valid(), maori_name_alternatives: [{ name: exact }] };
    expect(speciesFormSchema.safeParse(input).success).toBe(true);
    expect(speciesSchema.safeParse(speciesWriteValues(input)).success).toBe(true);

    for (const [name, message] of [
      [exact + "ā", lengthMessage(INPUT_LIMITS.shortText)],
      ["   ", "Enter a Māori name or remove this entry."],
    ] as const) {
      const invalid = { ...input, maori_name_alternatives: [{ name }] };
      const formResult = speciesFormSchema.safeParse(invalid);
      const serverResult = speciesSchema.safeParse(speciesWriteValues(invalid));
      expect(formResult.success).toBe(false);
      expect(serverResult.success).toBe(false);
      if (!formResult.success) expect(formResult.error.issues).toContainEqual(expect.objectContaining({
        path: ["maori_name_alternatives", 0, "name"], message,
      }));
      if (!serverResult.success) expect(serverResult.error.issues).toContainEqual(expect.objectContaining({
        path: ["maori_name_alternatives", 0], message,
      }));
    }
  });

  it("loads, normalizes and clears editable reference content", () => {
    const input = speciesFormSchema.parse({
      ...valid(),
      maori_name_alternatives: [{ name: "  Mingimingi  " }, { name: "  Mikimiki  " }],
      summary: "  A small native shrub.  ",
      look_for: "  Look for small leaves.  ",
    });
    const written = speciesWriteValues(input);
    expect(written).toMatchObject({
      maori_name_alternatives: ["Mingimingi", "Mikimiki"],
      summary: "A small native shrub.", look_for: "Look for small leaves.",
    });
    const saved = { ...written, updated_at: "2026-11-07T00:00:00Z" };
    expect(speciesFormValues(saved)).toEqual(input);
    expect(speciesWriteValues(speciesFormValues(saved))).toEqual(written);

    const cleared = speciesWriteValues(speciesFormSchema.parse({
      ...input, maori_name_alternatives: [], summary: "  ", look_for: "  ",
    }));
    expect(cleared).toMatchObject({ maori_name_alternatives: [], summary: null, look_for: null });
    expect(speciesFormValues({ ...cleared, updated_at: saved.updated_at })).toMatchObject({
      maori_name_alternatives: [], summary: "", look_for: "",
    });
  });

  it("asks for the scientific name before the web address name it fills in", () => {
    const html = renderToStaticMarkup(createElement(SpeciesForm, { onSubmit: async () => {} }));
    expect(html).toContain("Web address name");
    expect(html).not.toContain(">Slug<");
    expect(html.indexOf('name="scientific_name"')).toBeLessThan(html.indexOf('name="slug"'));
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
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["photos", 0, "src"]);
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
      ...valid(), over_5m: "no", threatened: "yes", common_name: "Mingimingi",
      photos: [{ src: "https://example.com/plant.jpg", attribution: "Photographer · CC BY" }],
    });
    const saved = { ...speciesWriteValues(input), needs_decision: true, updated_at: "2026-11-07T00:00:00Z" };
    expect(speciesWriteValues(speciesFormValues(saved))).toEqual(speciesWriteValues(input));
    expect(speciesWriteValues({ ...input, photos: [] })).toHaveProperty("photos", []);
  });

  it("accepts only the writable columns", () => {
    const species = speciesSchema.parse({ ...speciesWriteValues(valid()), status: "contested", register_note: "Preserve the stored note", sources: [], checked_at: "2026-11-24", updated_at: "Ignored" });
    expect(species).not.toHaveProperty("status");
    expect(species).not.toHaveProperty("register_note");
    expect(species).not.toHaveProperty("sources");
    expect(species).not.toHaveProperty("checked_at");
    expect(species).not.toHaveProperty("updated_at");
  });
});
