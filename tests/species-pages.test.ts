import { Children, isValidElement, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authenticated: vi.fn(), create: vi.fn(), update: vi.fn(), read: vi.fn(), revalidate: vi.fn(), tag: vi.fn(), redirect: vi.fn() }));
vi.mock("@/db/queries/access", () => ({ isAuthenticated: mocks.authenticated }));
vi.mock("@/db/queries/species", () => ({ createSpecies: mocks.create, updateSpecies: mocks.update, readSpeciesForEdit: mocks.read }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate, updateTag: mocks.tag }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/components/wrt/species/SpeciesForm", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/components/wrt/species/SpeciesForm")>(),
  SpeciesForm: () => null,
}));

import NewSpeciesPage from "@/app/species/new/page";
import EditSpeciesPage from "@/app/species/[slug]/edit/page";
import { SpeciesForm, emptySpecies, speciesWriteValues, type SpeciesInput, type SpeciesSubmitResult } from "@/components/wrt/species/SpeciesForm";

const values = speciesWriteValues({ ...emptySpecies, slug: "admin-chosen-name", scientific_name: "A plant" });
type Submit = (species: SpeciesInput) => Promise<SpeciesSubmitResult>;

async function pageForm(kind: "new" | "edit") {
  const page = kind === "new" ? await NewSpeciesPage() : await EditSpeciesPage({ params: Promise.resolve({ slug: "old-slug" }), searchParams: Promise.resolve({}) });
  return Children.toArray(page.props.children).find((child): child is ReactElement<{ onSubmit: Submit }> => isValidElement(child) && child.type === SpeciesForm);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.authenticated.mockResolvedValue(true);
  mocks.create.mockResolvedValue({ data: { slug: values.slug }, error: null });
  mocks.update.mockResolvedValue({ data: { slug: values.slug }, error: null });
  mocks.read.mockResolvedValue({ ...values, slug: "old-slug", updated_at: "2026-11-07T00:00:00Z" });
  mocks.redirect.mockImplementation(() => { throw new Error("REDIRECT"); });
});

describe.each(["new", "edit"] as const)("%s species page", (kind) => {
  it("hides the editor when signed out and checks authentication again on submission", async () => {
    const form = await pageForm(kind);
    mocks.authenticated.mockResolvedValue(false);
    expect(await form!.props.onSubmit(values)).toHaveProperty("error");
    expect(await pageForm(kind)).toBeUndefined();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("validates the final species again before writing and strips extra fields", async () => {
    const submit = (await pageForm(kind))!.props.onSubmit;
    expect(await submit({ ...values, slug: "photos" })).toHaveProperty("issues");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    await expect(submit({ ...values, ...{ created_by: "spoofed", profile: { summary: "Must not overwrite the imported profile" } } })).rejects.toThrow("REDIRECT");
    if (kind === "new") expect(mocks.create).toHaveBeenCalledWith(values);
    else expect(mocks.update).toHaveBeenCalledWith("old-slug", values);
  });

  it("handles duplicate slugs without clearing form values or redirecting", async () => {
    const write = kind === "new" ? mocks.create : mocks.update;
    write.mockResolvedValue({ data: null, error: { code: "23505" } });
    expect(await (await pageForm(kind))!.props.onSubmit(values)).toEqual({ issues: [{ path: "slug", message: expect.stringContaining("unique") }] });
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.tag).not.toHaveBeenCalled();
  });

  it("owns its database call, cache invalidation and success redirect", async () => {
    await expect((await pageForm(kind))!.props.onSubmit(values)).rejects.toThrow("REDIRECT");
    if (kind === "new") {
      expect(mocks.create).toHaveBeenCalledWith(values);
      expect(mocks.update).not.toHaveBeenCalled();
    } else {
      expect(mocks.update).toHaveBeenCalledWith("old-slug", values);
      expect(mocks.create).not.toHaveBeenCalled();
    }
    expect(mocks.tag).toHaveBeenCalledWith("supabase");
    expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
    expect(mocks.redirect).toHaveBeenCalledWith(`/species/${values.slug}/edit?saved=1`);
  });

  it("returns database failures as form errors", async () => {
    (kind === "new" ? mocks.create : mocks.update).mockRejectedValue(new Error("connection failed"));
    expect(await (await pageForm(kind))!.props.onSubmit(values)).toHaveProperty("error");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
