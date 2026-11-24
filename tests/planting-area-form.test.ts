import { describe, expect, it } from "vitest";
import {
  createPlantingAreaSchema,
  editPlantingAreaSchema,
  editSiteSchema,
  plantingAreaBoundarySchema,
} from "@/db/types";
import { INPUT_LIMITS } from "@/lib/forms/limits";
import { boundaryFromCorners } from "@/lib/wrt/areas/geometry";
import { partHref } from "@/lib/wrt/routes";

const area = { slug: "river-east", name: "River East", description: "" };

describe("planting area validation", () => {
  it("uses the shared corner limit for boundaries", () => {
    const polygon = (corners: number) => boundaryFromCorners(Array.from({ length: corners }, (_, index) => {
      const angle = index * 2 * Math.PI / corners;
      return [168.5 + 0.01 * Math.cos(angle), -45 + 0.01 * Math.sin(angle)];
    }));
    expect(plantingAreaBoundarySchema.safeParse(polygon(499)).success).toBe(true);
    expect(plantingAreaBoundarySchema.safeParse(polygon(500)).error?.issues[0]?.message).toContain("at most 499 corners");
  });

  it("reports an invalid longitude or latitude pair at the boundary field", () => {
    const result = editPlantingAreaSchema.safeParse({
      ...area,
      boundary: { type: "Polygon", coordinates: [[[0, 0, 25], [1, 0], [1, 1], [0, 0]]] },
    });
    expect(result.error?.issues[0]).toMatchObject({
      path: ["boundary"],
      message: expect.stringContaining("longitude and latitude"),
    });
  });

  it.each([
    { boundary: boundaryFromCorners([[0, 0], [1, 0], [1, 0]]), message: "Each corner needs a different location." },
    { boundary: boundaryFromCorners([[0, 0], [1, 1], [2, 2]]), message: "Draw a boundary that encloses an area." },
  ])("keeps the additional boundary check $message", ({ boundary, message }) => {
    expect(plantingAreaBoundarySchema.safeParse(boundary).error?.issues[0]?.message).toBe(message);
  });

  it.each([
    ["slug", INPUT_LIMITS.identifier],
    ["name", INPUT_LIMITS.shortText],
    ["description", INPUT_LIMITS.longText],
  ] as const)(
    "accepts %s at the limit and rejects one character over",
    (field, limit) => {
      const schemas =
        field === "slug"
          ? [createPlantingAreaSchema]
          : [createPlantingAreaSchema, editPlantingAreaSchema];
      for (const schema of schemas) {
        expect(
          schema.safeParse({ ...area, [field]: "a".repeat(limit) }).success,
        ).toBe(true);
        const result = schema.safeParse({
          ...area,
          [field]: "a".repeat(limit + 1),
        });
        expect(result.success).toBe(false);
        if (!result.success)
          expect(result.error.issues).toContainEqual(
            expect.objectContaining({ path: [field] }),
          );
      }
    },
  );

  it("allows blank descriptions and omits location and unrelated fields", () => {
    expect(
      createPlantingAreaSchema.parse({
        ...area,
        name: " River East ",
        site: "other",
        lat: -45,
        updated_by: "spoofed",
      }),
    ).toEqual(area);
    expect(
      editPlantingAreaSchema.parse({
        ...area,
        slug: "replacement",
        site: "other",
        wrt_number: "9A",
      }),
    ).toEqual({ name: area.name, description: "" });
  });

  it.each(["", "  "])("rejects missing names %j", (name) => {
    expect(editPlantingAreaSchema.safeParse({ ...area, name }).success).toBe(
      false,
    );
  });

  it.each(["", "River East", "river--east", "-river", "river-", "RIVER"])(
    "rejects invalid slug %j",
    (slug) => {
      expect(
        createPlantingAreaSchema.safeParse({ ...area, slug }).success,
      ).toBe(false);
    },
  );

  it("validates all rows before saving and locates duplicate slugs", () => {
    const result = editSiteSchema.safeParse({
      name: "Site",
      description: "",
      areas: [
        { ...area, existing: true },
        { ...area, existing: false },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0]?.path).toEqual(["areas", 1, "slug"]);
  });

  it("allows duplicate display names with different slugs", () => {
    expect(
      editSiteSchema.safeParse({
        name: "Site",
        description: "",
        areas: [
          { ...area, existing: true },
          { ...area, slug: "river-west", existing: false },
        ],
      }).success,
    ).toBe(true);
  });

  it("builds area URLs from fixed slugs rather than display names or parcel IDs", () => {
    expect(partHref("reserve", "reserve-east")).toBe(
      "/sites/reserve/parts/reserve-east",
    );
  });
});
