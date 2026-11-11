import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import Link from "next/link";
import { isAuthenticated } from "@/db/queries/auth";
import { readSite, updateSite } from "@/db/queries/sites";
import { SUPABASE_TAG } from "@/db/cache";
import { SiteForm } from "@/components/wrt/sites/SiteForm";
import { StaffAccessRequired } from "@/components/wrt/auth/staff-access-required";
import {
  editSiteSchema,
  type EditSiteInput,
  type SiteSubmitResult,
} from "@/db/types";
import { PageHead } from "@/components/wrt/shared/page";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit site" };

export default async function EditSitePage({
  params,
}: Readonly<PageProps<"/sites/[slug]/edit">>) {
  const { slug } = await params;
  if (!(await isAuthenticated()))
    return (
      <StaffAccessRequired
        title="Edit site"
        back={{ href: "/sites", label: "All sites" }}
        message="Sign in to edit sites."
        next={`/sites/${slug}/edit`}
      />
    );
  const site = await readSite(slug);
  if (!site || site.deactivated_at) notFound();

  async function onSubmit(input: EditSiteInput): Promise<SiteSubmitResult> {
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
      const { data, error } = await updateSite(slug, parsed.data);
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
    updateTag(SUPABASE_TAG);
    revalidatePath("/", "layout");
    redirect(`/sites/${savedSlug}`);
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
        key={site.updated_at}
        values={site}
        onSubmit={onSubmit}
        submitLabel="Save changes"
        cancelHref={`/sites/${slug}`}
      />
    </>
  );
}
