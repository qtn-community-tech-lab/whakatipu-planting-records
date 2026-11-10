import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { isAuthenticated } from "@/db/queries/access";
import { createSite } from "@/db/queries/sites";
import { SUPABASE_TAG } from "@/db/cache";
import { SiteForm } from "@/components/wrt/sites/SiteForm";
import {
  createSiteSchema,
  type CreateSiteInput,
  type SiteSubmitResult,
} from "@/db/types";
import { PageHead } from "@/components/wrt/shared/page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Create site" };

export default async function NewSitePage() {
  const authenticated = await isAuthenticated();

  async function onSubmit(input: CreateSiteInput): Promise<SiteSubmitResult> {
    "use server";
    if (!(await isAuthenticated()))
      return { error: "Sign in to create sites." };
    const parsed = createSiteSchema.safeParse(input);
    if (!parsed.success)
      return {
        issues: parsed.error.issues.map(({ path, message }) => ({
          path: path.join("."),
          message,
        })),
      };
    let slug: string;
    try {
      const { data, error } = await createSite(parsed.data);
      if (error?.code === "23505")
        return {
          issues: [
            {
              path: "slug",
              message: "This slug is already in use. Choose a unique slug.",
            },
          ],
        };
      if (error?.code === "42501")
        return {
          error: "You need to sign in with a staff account to create sites.",
        };
      if (error || !data)
        return { error: "The site could not be created. Please try again." };
      slug = data.slug;
    } catch {
      return { error: "The site could not be created. Please try again." };
    }
    updateTag(SUPABASE_TAG);
    revalidatePath("/", "layout");
    redirect(`/sites/${slug}`);
  }

  return (
    <>
      <PageHead
        title="Create site"
        back={{ href: "/sites", label: "All sites" }}
      />
      {authenticated ? (
        <SiteForm
          onSubmit={onSubmit}
          submitLabel="Create site"
          cancelHref="/sites"
        />
      ) : (
        <Alert>
          <AlertTitle>Sign-in required</AlertTitle>
          <AlertDescription>Sign in to create sites.</AlertDescription>
        </Alert>
      )}
    </>
  );
}
