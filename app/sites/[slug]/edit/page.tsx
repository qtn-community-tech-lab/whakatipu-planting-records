import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import Link from "next/link";
import { isAuthenticated } from "@/db/queries/access";
import {
  readSite,
  updateSite,
  listPlantingAreas,
} from "@/db/queries/sites";
import { savePlantingAreas } from "@/app/sites/save-planting-areas";
import { SUPABASE_TAG } from "@/db/cache";
import { SiteForm } from "@/components/wrt/sites/SiteForm";
import {
  editSiteSchema,
  type EditSiteInput,
  type SiteSubmitResult,
} from "@/db/types";
import { PageHead } from "@/components/wrt/shared/page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit site" };

export default async function EditSitePage({
  params,
}: Readonly<PageProps<"/sites/[slug]/edit">>) {
  if (!(await isAuthenticated()))
    return (
      <>
        <PageHead
          title="Edit site"
          back={{ href: "/sites", label: "All sites" }}
        />
        <Alert>
          <AlertTitle>Sign-in required</AlertTitle>
          <AlertDescription>Sign in to edit sites.</AlertDescription>
        </Alert>
      </>
    );
  const { slug } = await params;
  const [site, areas] = await Promise.all([
    readSite(slug),
    listPlantingAreas(slug),
  ]);
  if (!site || site.deactivated_at) notFound();

  async function onSubmit(
    input: EditSiteInput,
  ): Promise<SiteSubmitResult> {
    "use server";
    if (!(await isAuthenticated())) return { error: "Sign in to edit sites." };
    const parsed = editSiteSchema.safeParse(input);
    if (!parsed.success)
      return {
        issues: parsed.error.issues.map(({ path, message }) => ({
          path: path.join("."),
          message,
        })),
      };
    let savedSlug: string;
    try {
      const { data, error } = await updateSite(slug, {
        name: parsed.data.name,
        description: parsed.data.description,
        areas: parsed.data.areas,
      });
      if (error?.code === "42501")
        return {
          error: "You need to sign in with a staff account to edit sites.",
        };
      if (error || !data)
        return { error: "The site could not be saved. Please try again." };
      savedSlug = data.slug;
    } catch {
      return { error: "The site could not be saved. Please try again." };
    }
    const { savedAreas, issues } = await savePlantingAreas(slug, parsed.data.areas);
    updateTag(SUPABASE_TAG);
    revalidatePath("/", "layout");
    if (issues.length)
      return {
        savedAreas,
        issues,
        error:
          "The site and any successful areas were saved. Some areas could not be saved. Your changes are still here; please retry the unsaved areas.",
      };
    redirect(`/sites/${savedSlug}?saved=1`);
  }

  return (
    <>
      <PageHead
        title={`Edit ${site.name}`}
        back={{ href: "/sites", label: "All sites" }}
        aside={
          <Button asChild variant="secondary">
            <Link href={`/sites/${slug}`}>View site</Link>
          </Button>
        }
      />
      <SiteForm
        key={slug}
        values={site}
        areas={areas}
        onSubmit={onSubmit}
        submitLabel="Save site and areas"
        cancelHref={`/sites/${slug}`}
      />
    </>
  );
}
