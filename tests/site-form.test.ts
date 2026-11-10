import { describe, expect, it } from "vitest";
import { createSiteSchema, editSiteSchema } from "@/db/types";
import { INPUT_LIMITS, lengthMessage } from "@/lib/forms/limits";

const site = { slug: "river-reserve", name: "River Reserve", description: "" };

describe("site schemas", () => {
  it.each([
    ["slug", INPUT_LIMITS.identifier],
    ["name", INPUT_LIMITS.shortText],
    ["description", INPUT_LIMITS.longText],
  ] as const)("accepts %s at its limit and rejects one character over", (field, limit) => {
    const schemas = field === "slug" ? [createSiteSchema] : [createSiteSchema, editSiteSchema];
    for (const schema of schemas) {
      const value = "a".repeat(limit);
      expect(schema.parse({ ...site, [field]: value })[field]).toBe(value);
      const result = schema.safeParse({ ...site, [field]: `${value}a` });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues).toContainEqual(expect.objectContaining({ path: [field], message: lengthMessage(limit) }));
    }
  });

  it("allows creating without a description or location and trims text", () => {
    expect(createSiteSchema.parse({ ...site, name: "  River Reserve  ", description: "  By the river.  " }))
      .toEqual({ ...site, description: "By the river." });
    expect(createSiteSchema.parse(site)).toEqual(site);
  });

  it.each(["", "River Reserve", "river--reserve", "-reserve", "reserve-", "new", "Māori-name"])("rejects invalid or reserved creation slug %j", (slug) => {
    const result = createSiteSchema.safeParse({ ...site, slug });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["slug"]);
  });

  it.each([createSiteSchema, editSiteSchema])("rejects missing names", (schema) => {
    expect(schema.safeParse({ ...site, name: "  " }).success).toBe(false);
  });

  it("limits creation and editing to their own writable fields", () => {
    const extra = { ...site, slug: "another-slug", is_scheme: true, updated_by: "spoofed", deactivated_at: "now", lat: -45 };
    expect(createSiteSchema.parse(extra)).toEqual({ ...site, slug: "another-slug" });
    expect(editSiteSchema.parse(extra)).toEqual({ name: site.name, description: "" });
    expect(editSiteSchema.parse({ name: site.name, description: "" })).toEqual({ name: site.name, description: "" });
  });
});
