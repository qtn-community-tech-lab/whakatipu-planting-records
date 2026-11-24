import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { createSite, updateSite } from "@/db/queries/sites";
import { savePlantingAreas } from "@/app/sites/save-planting-areas";
import { SUPABASE_TAG } from "@/db/cache";
import { SiteForm } from "@/components/wrt/sites/SiteForm";
import {
  createSiteSchema,
  type CreateSiteInput,
  type SiteSubmitResult,
} from "@/db/types";
import { PageHead } from "@/components/wrt/shared/page";
import { isAuthenticated, requireAuthenticated } from "@/db/queries/auth";

export const metadata: Metadata = { title: "Create site" };

export default async function NewSitePage() {
  await requireAuthenticated("/sites/new");

  async function onSubmit(
    input: CreateSiteInput,
    savedSiteSlug?: string,
  ): Promise<SiteSubmitResult> {
    "use server";
    if (!(await isAuthenticated())) return { error: "Sign in to create sites." };
    const parsed = createSiteSchema.safeParse(input);
    if (!parsed.success)
      return {
        issues: parsed.error.issues.map(({ path, message }) => ({
          path: path.join("."),
          message,
        })),
      };
    // A partial save returns the fixed site identifier so retrying updates that site.
    if (savedSiteSlug !== undefined && savedSiteSlug !== parsed.data.slug)
      return {
        issues: [
          { path: "slug", message: "The saved site's slug cannot be changed." },
        ],
      };
    const { slug: siteSlug, areas: submittedAreas, ...details } = parsed.data;
    const areas = submittedAreas.map((area) => ({
      ...area,
      existing: savedSiteSlug !== undefined && area.existing === true,
    }));
    const siteValues = { ...details, areas };
    let slug: string;
    try {
      const { data, error } = savedSiteSlug
        ? await updateSite(savedSiteSlug, siteValues)
        : await createSite({ ...siteValues, slug: siteSlug });
      if (error?.code === "23505")
        return {
          issues: [
            {
              path: "slug",
              message: "This unique web address name is already in use. Please choose another.",
            },
          ],
        };
      if (error?.code === "42501")
        return {
          error: "You need to sign in with a staff account to save sites.",
        };
      if (error || !data)
        return { error: "The site could not be saved. Please try again." };
      slug = data.slug;
    } catch {
      return { error: "The site could not be saved. Please try again." };
    }
    const { savedAreas, issues } = await savePlantingAreas(slug, areas);
    updateTag(SUPABASE_TAG);
    revalidatePath("/", "layout");
    if (issues.length)
      return {
        savedSiteSlug: slug,
        savedAreas,
        issues,
        error:
          "The site and any successful areas were saved. Some areas could not be saved. Your changes are still here; please retry the unsaved areas.",
      };
    redirect(`/sites/${slug}?saved=1`);
  }

  return (
    <>
      <PageHead title="Create site" back={{ href: "/sites", label: "All sites" }} />
        <SiteForm
          onSubmit={onSubmit}
          submitLabel="Create site"
          cancelHref="/sites"
        />
    </>
  );
}
