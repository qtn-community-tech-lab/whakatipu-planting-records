import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import Link from "next/link";
import { isAuthenticated, requireAuthenticated } from "@/db/queries/auth";
import { readSpeciesForEdit, updateSpecies } from "@/db/queries/species";
import { SUPABASE_TAG } from "@/db/cache";
import { SpeciesForm } from "@/components/wrt/species/SpeciesForm";
import { speciesSchema, type SpeciesInput, type SpeciesSubmitResult } from "@/db/types";
import { PageHead } from "@/components/wrt/shared/page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit species" };

export default async function EditSpeciesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { slug } = await params;
  await requireAuthenticated(`/species/${slug}/edit`);
  const [species, query] = await Promise.all([
    readSpeciesForEdit(slug),
    searchParams,
  ]);
  if (!species) notFound();
  const speciesHref = `/species/${slug}` as Route;

  async function onSubmit(input: SpeciesInput): Promise<SpeciesSubmitResult> {
    "use server";
    if (!(await isAuthenticated()))
      return { error: "Sign in to edit species." };
    const parsed = speciesSchema.safeParse(input);
    if (!parsed.success)
      return {
        issues: parsed.error.issues.map(({ path, message }) => ({
          path: path.join("."),
          message,
        })),
      };
    if (parsed.data.slug !== slug)
      return {
        issues: [{ path: "slug", message: "The slug cannot be changed after the species is created." }],
      };
    let savedSlug: string;
    try {
      const { data, error } = await updateSpecies(slug, parsed.data);
      if (error)
        return { error: "The species could not be saved. Please try again." };
      savedSlug = data.slug;
    } catch {
      return { error: "The species could not be saved. Please try again." };
    }
    updateTag(SUPABASE_TAG);
    revalidatePath("/", "layout");
    redirect(`/species/${savedSlug}/edit?saved=1`);
  }

  return (
    <>
      <PageHead
        title={`Edit ${species.scientific_name}`}
        back={{ href: "/species", label: "All species" }}
        aside={
          <Button asChild variant="secondary">
            <Link href={speciesHref}>View species</Link>
          </Button>
        }
      />
      {query.saved === "1" && (
        <Alert role="status">
          <AlertTitle>Species saved</AlertTitle>
          <AlertDescription>Your changes have been saved.</AlertDescription>
        </Alert>
      )}
      <SpeciesForm
        key={species.updated_at}
        values={species}
        onSubmit={onSubmit}
        submitLabel="Save changes"
        cancelHref={speciesHref}
      />
    </>
  );
}
