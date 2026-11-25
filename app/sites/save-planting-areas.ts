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
    const { slug: areaSlug, existing, ...values } = area;
    try {
      const { data, error } = existing
        ? await updatePlantingArea(slug, areaSlug, values)
        : await createPlantingArea(slug, { slug: areaSlug, ...values });
      if (!error && data) savedAreas.push({ index, slug: data.slug });
      else
        issues.push({
          path: `areas.${index}.${error?.code === "23505" ? "slug" : "name"}`,
          message:
            error?.code === "23505"
              ? "This unique web address name is already in use. Please choose another."
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
