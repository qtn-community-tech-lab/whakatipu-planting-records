import { createPlantingArea, updatePlantingArea } from "@/db/queries/sites";
import type { EditSiteInput, SiteSubmitResult } from "@/db/types";

/** Shared by site actions after access checks, validation and a successful site save. */
export async function savePlantingAreas(
  slug: string,
  areas: EditSiteInput["areas"],
) {
  const savedAreas: NonNullable<SiteSubmitResult["savedAreas"]> = [];
  const issues: NonNullable<SiteSubmitResult["issues"]> = [];
  for (const [index, area] of areas.entries()) {
    try {
      const { data, error } = area.existing
        ? await updatePlantingArea(slug, area.slug, {
            name: area.name,
            description: area.description,
          })
        : await createPlantingArea(slug, {
            slug: area.slug,
            name: area.name,
            description: area.description,
          });
      if (!error && data) savedAreas.push({ index, slug: data.slug });
      else
        issues.push({
          path: `areas.${index}.${error?.code === "23505" ? "slug" : "name"}`,
          message:
            error?.code === "23505"
              ? "This slug is already in use. Choose a unique slug."
              : error?.code === "42501"
                ? "You need a staff account to save this area."
                : "This area could not be saved. Please try again.",
        });
    } catch {
      issues.push({
        path: `areas.${index}.name`,
        message: "This area could not be saved. Please try again.",
      });
    }
  }
  return { savedAreas, issues };
}
