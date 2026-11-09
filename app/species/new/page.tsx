import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { isAuthenticated } from "@/db/queries/access";
import { createSpecies } from "@/db/queries/species";
import { SUPABASE_TAG } from "@/db/cache";
import { SpeciesForm } from "@/components/wrt/species/SpeciesForm";
import { speciesSchema, type SpeciesInput, type SpeciesSubmitResult } from "@/db/types";
import { PageHead } from "@/components/wrt/shared/page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Create species" };

export default async function NewSpeciesPage() {
  const authenticated = await isAuthenticated();

  async function onSubmit(input: SpeciesInput): Promise<SpeciesSubmitResult> {
    "use server";
    if (!(await isAuthenticated()))
      return { error: "Sign in to create species." };
    const parsed = speciesSchema.safeParse(input);
    if (!parsed.success)
      return {
        issues: parsed.error.issues.map(({ path, message }) => ({
          path: path.join("."),
          message,
        })),
      };
    let slug: string;
    try {
      const { data, error } = await createSpecies(parsed.data);
      if (error?.code === "23505")
        return {
          issues: [
            {
              path: "slug",
              message: "This slug is already in use. Choose a unique slug.",
            },
          ],
        };
      if (error || !data)
        return { error: "The species could not be created. Please try again." };
      slug = data.slug;
    } catch {
      return { error: "The species could not be created. Please try again." };
    }
    updateTag(SUPABASE_TAG);
    revalidatePath("/", "layout");
    redirect(`/species/${slug}/edit?saved=1`);
  }

  return (
    <>
      <PageHead
        title="Create species"
        back={{ href: "/species", label: "All species" }}
      />
      {authenticated ? (
        <SpeciesForm onSubmit={onSubmit} submitLabel="Create species" />
      ) : (
        <Alert>
          <AlertTitle>Sign-in required</AlertTitle>
          <AlertDescription>Sign in to create species.</AlertDescription>
        </Alert>
      )}
    </>
  );
}
