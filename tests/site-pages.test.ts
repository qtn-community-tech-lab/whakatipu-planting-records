import { Children, isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { q } from "./helpers";

const mocks = vi.hoisted(() => ({
  authenticated: vi.fn(), create: vi.fn(), update: vi.fn(), read: vi.fn(), list: vi.fn(),
  revalidate: vi.fn(), tag: vi.fn(), redirect: vi.fn(), places: vi.fn(), place: vi.fn(), overview: vi.fn(), records: vi.fn(),
}));
vi.mock("@/db/queries/access", () => ({ isAuthenticated: mocks.authenticated }));
vi.mock("@/db/queries/sites", () => ({ createSite: mocks.create, updateSite: mocks.update, readSite: mocks.read, listSites: mocks.list }));
vi.mock("@/lib/wrt/server", () => ({ getWrt: () => ({ places: mocks.places, place: mocks.place, overview: mocks.overview, records: mocks.records }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate, updateTag: mocks.tag }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/components/wrt/sites/SiteForm", () => ({ SiteForm: () => null }));
vi.mock("@/components/wrt/sites/location-card", () => ({ LocationCard: () => null }));

import NewSitePage from "@/app/sites/new/page";
import EditSitePage from "@/app/sites/[slug]/edit/page";
import SitesPage from "@/app/sites/page";
import SitePage, { generateMetadata } from "@/app/sites/[slug]/page";
import { SiteForm } from "@/components/wrt/sites/SiteForm";
import type { CreateSiteInput, SiteSubmitResult } from "@/db/types";
import { INPUT_LIMITS, lengthMessage } from "@/lib/forms/limits";

const values = { slug: "new-reserve", name: "New Reserve", description: "Beside the river." };
const params = Promise.resolve({ slug: values.slug });
const searchParams = Promise.resolve({});
type Submit = (input: CreateSiteInput) => Promise<SiteSubmitResult>;

async function pageForm(kind: "new" | "edit") {
  const page = kind === "new" ? await NewSitePage() : await EditSitePage({ params, searchParams });
  return Children.toArray(page.props.children).find((child): child is ReactElement<{ onSubmit: Submit }> => isValidElement(child) && child.type === SiteForm);
}

beforeEach(async () => {
  vi.resetAllMocks();
  mocks.authenticated.mockResolvedValue(true);
  mocks.create.mockResolvedValue({ data: { slug: values.slug }, error: null });
  mocks.update.mockResolvedValue({ data: { slug: values.slug }, error: null });
  mocks.read.mockResolvedValue({ ...values, is_scheme: false, updated_at: "2026-11-10T00:00:00Z" });
  mocks.redirect.mockImplementation(() => { throw new Error("REDIRECT"); });
  const history = await q.places();
  mocks.places.mockResolvedValue(history);
  mocks.place.mockResolvedValue(null);
  mocks.overview.mockResolvedValue(await q.overview());
  mocks.records.mockResolvedValue(await q.records());
  mocks.list.mockResolvedValue([
    ...history.map(({ item }) => ({ slug: item.slug, name: item.name, is_scheme: item.isScheme })),
    { slug: "aaa-new", name: "AAA new site", is_scheme: false },
    { slug: "zzz-new", name: "ZZZ new site", is_scheme: false },
  ]);
});

describe.each(["new", "edit"] as const)("%s site action", (kind) => {
  it("checks access both when rendering and when saving", async () => {
    const submit = (await pageForm(kind))!.props.onSubmit;
    mocks.authenticated.mockResolvedValue(false);
    expect(await submit(values)).toHaveProperty("error");
    expect(await pageForm(kind)).toBeUndefined();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("validates input before writing", async () => {
    expect(await (await pageForm(kind))!.props.onSubmit({ ...values, name: "  " })).toHaveProperty("issues");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each([
    ["name", INPUT_LIMITS.shortText],
    ["description", INPUT_LIMITS.longText],
  ] as const)("rejects an overlong %s before writing", async (field, limit) => {
    const result = await (await pageForm(kind))!.props.onSubmit({ ...values, [field]: "a".repeat(limit + 1) });
    expect(result.issues).toContainEqual({ path: field, message: lengthMessage(limit) });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("writes only allowed fields and invalidates shared data before redirecting", async () => {
    const input = { ...values, slug: "changed-slug", is_scheme: true, updated_by: "spoofed", deactivated_at: "now" };
    await expect((await pageForm(kind))!.props.onSubmit(input)).rejects.toThrow("REDIRECT");
    if (kind === "new") expect(mocks.create).toHaveBeenCalledWith({ ...values, slug: "changed-slug" });
    else expect(mocks.update).toHaveBeenCalledWith(values.slug, { name: values.name, description: values.description });
    expect(mocks.tag).toHaveBeenCalledWith("supabase");
    expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
    expect(mocks.redirect).toHaveBeenCalledWith(`/sites/${values.slug}`);
    expect(mocks.tag.mock.invocationCallOrder[0]).toBeLessThan(mocks.revalidate.mock.invocationCallOrder[0]!);
    expect(mocks.revalidate.mock.invocationCallOrder[0]).toBeLessThan(mocks.redirect.mock.invocationCallOrder[0]!);
  });

  it("preserves retryable failures without invalidating caches", async () => {
    (kind === "new" ? mocks.create : mocks.update).mockRejectedValue(new Error("Database unavailable"));
    expect(await (await pageForm(kind))!.props.onSubmit(values)).toHaveProperty("error");
    expect(mocks.tag).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("explains database permission failures", async () => {
    (kind === "new" ? mocks.create : mocks.update).mockResolvedValue({ data: null, error: { code: "42501" } });
    expect(await (await pageForm(kind))!.props.onSubmit(values)).toEqual({ error: expect.stringContaining("staff account") });
  });
});

it("maps duplicate creation slugs to the slug field", async () => {
  mocks.create.mockResolvedValue({ data: null, error: { code: "23505" } });
  expect(await (await pageForm("new"))!.props.onSubmit(values)).toEqual({ issues: [{ path: "slug", message: expect.stringContaining("unique slug") }] });
  expect(mocks.tag).not.toHaveBeenCalled();
});

it("rejects malformed creation slugs and shows unknown edit sites as not found", async () => {
  expect(await (await pageForm("new"))!.props.onSubmit({ ...values, slug: "new" })).toHaveProperty("issues");
  mocks.read.mockResolvedValue(null);
  await expect(EditSitePage({ params, searchParams })).rejects.toThrow("NOT_FOUND");
});

it("lists sites without history, sorts by name or recency and preserves class filtering", async () => {
  const byName = renderToStaticMarkup(await SitesPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ sort: "name" }) }));
  expect(byName).toContain("No planting records yet");
  expect(byName.indexOf('href="/sites/aaa-new"')).toBeLessThan(byName.indexOf('href="/sites/zzz-new"'));
  const recent = renderToStaticMarkup(await SitesPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ sort: "recent" }) }));
  expect(recent.lastIndexOf('href="/sites/aaa-new"')).toBeGreaterThan(recent.indexOf('href="/sites/whitechapel"'));
  const filtered = renderToStaticMarkup(await SitesPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ class: "keystone" }) }));
  expect(filtered).not.toContain('href="/sites/aaa-new"');
});

it("opens a site's detail and metadata before any planting history exists", async () => {
  const html = renderToStaticMarkup(await SitePage({ params, searchParams }));
  expect(html).toContain(values.name);
  expect(html).toContain(values.description);
  expect(html).toContain("No planting records yet");
  expect(html).toContain(`/sites/${values.slug}/edit`);
  expect(await generateMetadata({ params })).toEqual({ title: values.name, description: values.description });
  mocks.authenticated.mockResolvedValue(false);
  expect(renderToStaticMarkup(await SitePage({ params, searchParams }))).not.toContain("Edit site");
  mocks.read.mockResolvedValue(null);
  await expect(SitePage({ params, searchParams })).rejects.toThrow("NOT_FOUND");
});
