import { Children, isValidElement, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as SpeciesFormModule from "@/components/wrt/species/SpeciesForm";
import { INPUT_LIMITS } from "@/lib/forms/limits";

const mocks = vi.hoisted(() => ({ authenticated: vi.fn(), create: vi.fn(), update: vi.fn(), read: vi.fn(), revalidate: vi.fn(), tag: vi.fn(), redirect: vi.fn() }));
vi.mock("@/db/queries/auth", () => ({
  isAuthenticated: mocks.authenticated,
  requireAuthenticated: async (next: string) => {
    if (!(await mocks.authenticated())) mocks.redirect(`/login?next=${encodeURIComponent(next)}`);
  },
}));
vi.mock("@/db/queries/species", () => ({ createSpecies: mocks.create, updateSpecies: mocks.update, readSpeciesForEdit: mocks.read }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate, updateTag: mocks.tag }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/components/wrt/species/SpeciesForm", async (importOriginal) => ({
  ...await importOriginal<typeof SpeciesFormModule>(),
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
  mocks.update.mockResolvedValue({ data: { slug: "old-slug" }, error: null });
  mocks.read.mockResolvedValue({ ...values, slug: "old-slug", updated_at: "2026-11-07T00:00:00Z" });
  mocks.redirect.mockImplementation(() => { throw new Error("REDIRECT"); });
});

describe.each(["new", "edit"] as const)("%s species page", (kind) => {
  const input = kind === "new" ? values : { ...values, slug: "old-slug" };

  it("rejects overlong input on the server before writing", async () => {
    const result = await (await pageForm(kind))!.props.onSubmit({
      ...input, scientific_name: "a".repeat(INPUT_LIMITS.shortText + 1),
    });
    expect(result.issues).toContainEqual(expect.objectContaining({ path: "scientific_name" }));
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("hides the editor when signed out and checks authentication again on submission", async () => {
    const form = await pageForm(kind);
    mocks.authenticated.mockResolvedValue(false);
    expect(await form!.props.onSubmit(values)).toHaveProperty("error");
    mocks.read.mockClear();
    await expect(pageForm(kind)).rejects.toThrow("REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith(`/login?next=${encodeURIComponent(kind === "new" ? "/species/new" : "/species/old-slug/edit")}`);
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("validates the final species again before writing and strips extra fields", async () => {
    const submit = (await pageForm(kind))!.props.onSubmit;
    expect(await submit({ ...values, slug: "photos" })).toHaveProperty("issues");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    await expect(submit({ ...input, ...{ created_by: "spoofed", needs_decision: true, profile: { summary: "Must not overwrite the imported profile" } } })).rejects.toThrow("REDIRECT");
    if (kind === "new") expect(mocks.create).toHaveBeenCalledWith(input);
    else expect(mocks.update).toHaveBeenCalledWith("old-slug", input);
  });

  if (kind === "new") it("handles duplicate slugs without clearing form values or redirecting", async () => {
    mocks.create.mockResolvedValue({ data: null, error: { code: "23505" } });
    expect(await (await pageForm(kind))!.props.onSubmit(input)).toEqual({ issues: [{ path: "slug", message: expect.stringContaining("unique") }] });
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.tag).not.toHaveBeenCalled();
  });

  it("owns its database call, cache invalidation and success redirect", async () => {
    await expect((await pageForm(kind))!.props.onSubmit(input)).rejects.toThrow("REDIRECT");
    if (kind === "new") {
      expect(mocks.create).toHaveBeenCalledWith(values);
      expect(mocks.update).not.toHaveBeenCalled();
    } else {
      expect(mocks.update).toHaveBeenCalledWith("old-slug", input);
      expect(mocks.create).not.toHaveBeenCalled();
    }
    expect(mocks.tag).toHaveBeenCalledWith("supabase");
    expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
    expect(mocks.redirect).toHaveBeenCalledWith(`/species/${input.slug}/edit?saved=1`);
  });

  it("returns database failures as form errors", async () => {
    (kind === "new" ? mocks.create : mocks.update).mockRejectedValue(new Error("connection failed"));
    expect(await (await pageForm(kind))!.props.onSubmit(input)).toHaveProperty("error");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  if (kind === "edit") it("rejects a changed slug before writing or invalidating caches", async () => {
    expect(await (await pageForm(kind))!.props.onSubmit(values)).toEqual({
      issues: [{ path: "slug", message: "The slug cannot be changed after the species is created." }],
    });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.tag).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  if (kind === "new") it("explains when database permissions reject creation", async () => {
    mocks.create.mockResolvedValue({ data: null, error: { code: "42501", message: "permission denied for table species" } });
    expect(await (await pageForm(kind))!.props.onSubmit(values)).toEqual({ error: "You need to sign in with a staff account to create species." });
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.tag).not.toHaveBeenCalled();
  });
});
