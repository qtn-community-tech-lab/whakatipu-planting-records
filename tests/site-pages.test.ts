import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { q } from "./helpers";

const mocks = vi.hoisted(() => ({
  deactivate: vi.fn(), authenticated: vi.fn(), create: vi.fn(), update: vi.fn(), read: vi.fn(), list: vi.fn(),
  areas: vi.fn(), readArea: vi.fn(), createArea: vi.fn(), updateArea: vi.fn(),
  revalidate: vi.fn(), tag: vi.fn(), redirect: vi.fn(), places: vi.fn(), place: vi.fn(), overview: vi.fn(), records: vi.fn(), seasons: vi.fn(),
}));
vi.mock("@/db/queries/access", () => ({ isAuthenticated: mocks.authenticated }));
vi.mock("@/db/queries/sites", () => ({ deactivateSite: mocks.deactivate, createSite: mocks.create, updateSite: mocks.update, readSite: mocks.read, listSites: mocks.list, listPlantingAreas: mocks.areas, readPlantingArea: mocks.readArea, createPlantingArea: mocks.createArea, updatePlantingArea: mocks.updateArea }));
vi.mock("@/lib/wrt/server", () => ({ getWrt: () => ({ places: mocks.places, place: mocks.place, overview: mocks.overview, records: mocks.records, seasons: mocks.seasons }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate, updateTag: mocks.tag }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/components/wrt/sites/SiteForm", () => ({ SiteForm: () => null }));
vi.mock("@/components/wrt/sites/location-card", () => ({ LocationCard: () => null }));

import NewSitePage from "@/app/sites/new/page";
import EditSitePage from "@/app/sites/[slug]/edit/page";
import SitesPage from "@/app/sites/page";
import SitePage, { generateMetadata } from "@/app/sites/[slug]/page";
import PartPage, { generateMetadata as areaMetadata } from "@/app/sites/[slug]/parts/[part]/page";
import { DeactivateSite } from "@/components/wrt/sites/deactivate-site";
import { PageHead } from "@/components/wrt/shared/page";
import { SiteForm } from "@/components/wrt/sites/SiteForm";
import type { CreateSiteInput, SiteSubmitResult, PlantingAreaEdit } from "@/db/types";
import { INPUT_LIMITS, lengthMessage } from "@/lib/forms/limits";

const values = { slug: "new-reserve", name: "New Reserve", description: "Beside the river." };
const params = Promise.resolve({ slug: values.slug });
const searchParams = Promise.resolve({});
type Submit = (input: CreateSiteInput, savedSiteSlug?: string) => Promise<SiteSubmitResult>;

async function pageForm(kind: "new" | "edit") {
  const page = kind === "new" ? await NewSitePage() : await EditSitePage({ params, searchParams });
  return Children.toArray(page.props.children).find((child): child is ReactElement<{ onSubmit: Submit; areas?: PlantingAreaEdit[] }> => isValidElement(child) && child.type === SiteForm);
}

beforeEach(async () => {
  vi.resetAllMocks();
  mocks.authenticated.mockResolvedValue(true);
  mocks.deactivate.mockResolvedValue({ data: { slug: values.slug }, error: null });
  mocks.areas.mockResolvedValue([]);
  mocks.seasons.mockResolvedValue(await q.seasons());
  mocks.readArea.mockResolvedValue(null);
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
    expect(await submit({ ...values, areas: [] })).toHaveProperty("error");
    expect(await pageForm(kind)).toBeUndefined();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("validates input before writing", async () => {
    expect(await (await pageForm(kind))!.props.onSubmit({ ...values, areas: [], name: "  " })).toHaveProperty("issues");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each([
    ["name", INPUT_LIMITS.shortText],
    ["description", INPUT_LIMITS.longText],
  ] as const)("rejects an overlong %s before writing", async (field, limit) => {
    const result = await (await pageForm(kind))!.props.onSubmit({ ...values, areas: [], [field]: "a".repeat(limit + 1) });
    expect(result.issues).toContainEqual({ path: field, message: lengthMessage(limit) });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("writes only allowed fields and invalidates shared data before redirecting", async () => {
    const input = { ...values, areas: [], slug: "changed-slug", is_scheme: true, updated_by: "spoofed", deactivated_at: "now" };
    await expect((await pageForm(kind))!.props.onSubmit(input)).rejects.toThrow("REDIRECT");
    if (kind === "new") expect(mocks.create).toHaveBeenCalledWith({ ...values, areas: [], slug: "changed-slug" });
    else expect(mocks.update).toHaveBeenCalledWith(values.slug, { name: values.name, description: values.description, areas: [] });
    expect(mocks.tag).toHaveBeenCalledWith("supabase");
    expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
    expect(mocks.redirect).toHaveBeenCalledWith(`/sites/${values.slug}?saved=1`);
    expect(mocks.tag.mock.invocationCallOrder[0]).toBeLessThan(mocks.revalidate.mock.invocationCallOrder[0]!);
    expect(mocks.revalidate.mock.invocationCallOrder[0]).toBeLessThan(mocks.redirect.mock.invocationCallOrder[0]!);
  });

  it("preserves retryable failures without invalidating caches", async () => {
    (kind === "new" ? mocks.create : mocks.update).mockRejectedValue(new Error("Database unavailable"));
    expect(await (await pageForm(kind))!.props.onSubmit({ ...values, areas: [] })).toHaveProperty("error");
    expect(mocks.tag).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("explains database permission failures", async () => {
    (kind === "new" ? mocks.create : mocks.update).mockResolvedValue({ data: null, error: { code: "42501" } });
    expect(await (await pageForm(kind))!.props.onSubmit({ ...values, areas: [] })).toEqual({ error: expect.stringContaining("staff account") });
  });
});

it("maps duplicate creation slugs to the slug field", async () => {
  mocks.create.mockResolvedValue({ data: null, error: { code: "23505" } });
  expect(await (await pageForm("new"))!.props.onSubmit({ ...values, areas: [] })).toEqual({ issues: [{ path: "slug", message: expect.stringContaining("unique slug") }] });
  expect(mocks.tag).not.toHaveBeenCalled();
});

it("rejects an overlong creation slug before writing", async () => {
  const result = await (await pageForm("new"))!.props.onSubmit({ ...values, areas: [], slug: "a".repeat(INPUT_LIMITS.identifier + 1) });
  expect(result.issues).toContainEqual({ path: "slug", message: lengthMessage(INPUT_LIMITS.identifier) });
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.redirect).not.toHaveBeenCalled();
});

it("rejects malformed creation slugs and shows unknown edit sites as not found", async () => {
  expect(await (await pageForm("new"))!.props.onSubmit({ ...values, areas: [], slug: "new" })).toHaveProperty("issues");
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

const area = { slug: "east-bank", name: "East bank", description: "By the river.", existing: false };

it("does not attempt area writes if saving the site fails", async () => {
  mocks.update.mockResolvedValue({ data: null, error: { code: "42501" } });
  const result = await (await pageForm("edit"))!.props.onSubmit({ ...values, areas: [area] });
  expect(result.error).toContain("staff account");
  expect(mocks.createArea).not.toHaveBeenCalled();
  expect(mocks.updateArea).not.toHaveBeenCalled();
  expect(mocks.tag).not.toHaveBeenCalled();
});

it("validates every area before saving any part of the form", async () => {
  const result = await (await pageForm("edit"))!.props.onSubmit({ ...values, areas: [area, { ...area, slug: "west-bank", name: " " }] });
  expect(result.issues).toContainEqual({ path: "areas.1.name", message: "Enter an area name." });
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.createArea).not.toHaveBeenCalled();
});

it("continues after area failures and returns indexed successes for safe retries", async () => {
  mocks.updateArea.mockRejectedValue(new Error("Unavailable"));
  mocks.createArea
    .mockResolvedValueOnce({ data: null, error: { code: "23505" } })
    .mockResolvedValueOnce({ data: { slug: "south-bank" }, error: null });
  const result = await (await pageForm("edit"))!.props.onSubmit({ ...values, areas: [
    { ...area, existing: true }, { ...area, slug: "west-bank" }, { ...area, slug: "south-bank" },
  ] });
  expect(result.savedAreas).toEqual([{ index: 2, slug: "south-bank" }]);
  expect(result.issues).toEqual([
    { path: "areas.0.name", message: expect.stringContaining("could not be saved") },
    { path: "areas.1.slug", message: expect.stringContaining("unique slug") },
  ]);
  expect(result.error).toContain("were saved");
  expect(mocks.updateArea).toHaveBeenCalledWith(values.slug, area.slug, { name: area.name, description: area.description });
  expect(mocks.createArea).toHaveBeenCalledTimes(2);
  expect(mocks.update.mock.invocationCallOrder[0]).toBeLessThan(mocks.updateArea.mock.invocationCallOrder[0]!);
  expect(mocks.updateArea.mock.invocationCallOrder[0]).toBeLessThan(mocks.createArea.mock.invocationCallOrder[0]!);
  expect(mocks.tag).toHaveBeenCalled();
  expect(mocks.revalidate).toHaveBeenCalled();
  expect(mocks.redirect).not.toHaveBeenCalled();
});

it("scopes area writes to the captured site and writes only editable fields", async () => {
  mocks.updateArea.mockResolvedValue({ data: { slug: area.slug }, error: null });
  mocks.createArea.mockResolvedValue({ data: { slug: "west-bank" }, error: null });
  const input = { ...values, site: "other-site", areas: [
    { ...area, existing: true, site: "other-site", lat: -45, wrt_number: "9A" },
    { ...area, slug: "west-bank", site: "other-site", lng: 168, updated_by: "spoofed" },
  ] };
  await expect((await pageForm("edit"))!.props.onSubmit(input)).rejects.toThrow("REDIRECT");
  expect(mocks.updateArea).toHaveBeenCalledWith(values.slug, area.slug, { name: area.name, description: area.description });
  expect(mocks.createArea).toHaveBeenCalledWith(values.slug, { slug: "west-bank", name: area.name, description: area.description });
  expect(mocks.redirect).toHaveBeenCalledWith(`/sites/${values.slug}?saved=1`);
});

it("keeps the area register in the editor and shows only the saved status on site detail", async () => {
  const areas = [{ ...area, site: values.slug, updated_at: "now" }];
  mocks.areas.mockResolvedValue(areas);
  expect((await pageForm("edit"))?.props.areas).toEqual(areas);
  mocks.areas.mockClear();
  const html = renderToStaticMarkup(await SitePage({ params, searchParams: Promise.resolve({ saved: "1" }) }));
  expect(html).toContain("Changes saved");
  expect(html).toContain("No planting records yet");
  expect(html).not.toContain("Areas (1)");
  expect(html).not.toContain("Add area");
  expect(html).not.toContain("Edit area");
  expect(mocks.areas).not.toHaveBeenCalled();
});

it("opens area details and metadata without planting history and rejects another parent", async () => {
  mocks.readArea.mockResolvedValue({ ...area, site: values.slug, updated_at: "now" });
  const areaParams = Promise.resolve({ slug: values.slug, part: area.slug });
  const html = renderToStaticMarkup(await PartPage({ params: areaParams, searchParams }));
  expect(html).toContain(area.name);
  expect(html).toContain(area.description);
  expect(html).toContain("No planting records yet");
  expect(html).toContain(`/sites/${values.slug}/edit#area-${area.slug}`);
  expect(await areaMetadata({ params: areaParams, searchParams })).toMatchObject({ title: `${area.name} · ${values.name}`, description: area.description });
  expect(mocks.readArea).toHaveBeenCalledWith(values.slug, area.slug);
  mocks.readArea.mockResolvedValue(null);
  await expect(PartPage({ params: Promise.resolve({ slug: "other", part: area.slug }), searchParams })).rejects.toThrow("NOT_FOUND");
});

it("finds historical areas by fixed slug after correcting their display names", async () => {
  const place = (await q.places())[0]!.item;
  const d = (await q.place(place.slug))!;
  const parcel = d.parcels[0]!.item;
  mocks.place.mockResolvedValue(d);
  mocks.read.mockResolvedValue({ slug: place.slug, name: place.name, description: "", is_scheme: false });
  mocks.readArea.mockResolvedValue({ slug: parcel.slug, site: place.slug, name: "Corrected area name", description: "Corrected description" });
  const html = renderToStaticMarkup(await PartPage({ params: Promise.resolve({ slug: place.slug, part: parcel.slug }), searchParams }));
  expect(html).toContain("recorded plants at Corrected area name");
  expect(html).toContain("Corrected description");
  expect(html).toContain(`parcel=${encodeURIComponent(parcel.id)}`);
});

it("creates a site before its areas and returns its fixed slug after a partial save", async () => {
  mocks.createArea.mockResolvedValueOnce({ data: null, error: { code: "23505" } })
    .mockResolvedValueOnce({ data: { slug: "west-bank" }, error: null });
  const submit = (await pageForm("new"))!.props.onSubmit;
  const result = await submit({ ...values, areas: [area, { ...area, slug: "west-bank" }] });
  expect(result).toMatchObject({ savedSiteSlug: values.slug, savedAreas: [{ index: 1, slug: "west-bank" }], issues: [{ path: "areas.0.slug", message: expect.stringContaining("unique slug") }] });
  expect(mocks.create).toHaveBeenCalledTimes(1);
  expect(mocks.create).toHaveBeenCalledWith({ ...values, areas: [area, { ...area, slug: "west-bank" }] });
  expect(mocks.createArea.mock.invocationCallOrder[0]).toBeGreaterThan(mocks.create.mock.invocationCallOrder[0]!);
  expect(mocks.createArea).toHaveBeenCalledWith(values.slug, { slug: area.slug, name: area.name, description: area.description });
  expect(mocks.tag).toHaveBeenCalled();
  expect(mocks.redirect).not.toHaveBeenCalled();

  mocks.createArea.mockResolvedValue({ data: { slug: "east-bank-fixed" }, error: null });
  await expect(submit({ ...values, areas: [{ ...area, slug: "east-bank-fixed" }] }, result.savedSiteSlug)).rejects.toThrow("REDIRECT");
  expect(mocks.create).toHaveBeenCalledTimes(1);
  expect(mocks.update).toHaveBeenCalledWith(values.slug, { name: values.name, description: values.description, areas: [{ ...area, slug: "east-bank-fixed" }] });
  expect(mocks.redirect).toHaveBeenCalledWith(`/sites/${values.slug}?saved=1`);
});

it("validates creation areas before creating the parent site", async () => {
  const result = await (await pageForm("new"))!.props.onSubmit({ ...values, areas: [{ ...area, name: " " }] });
  expect(result.issues).toContainEqual({ path: "areas.0.name", message: "Enter an area name." });
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.createArea).not.toHaveBeenCalled();
});

it("rejects changing the fixed site slug when retrying a partial creation", async () => {
  const result = await (await pageForm("new"))!.props.onSubmit({ ...values, areas: [] }, "other-site");
  expect(result.issues).toContainEqual({ path: "slug", message: expect.stringContaining("cannot be changed") });
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});

async function deactivationAction() {
  const page = await SitePage({ params, searchParams });
  const header = Children.toArray(page.props.children).find(
    (child): child is ReactElement<{ aside?: ReactNode }> =>
      isValidElement(child) && child.type === PageHead,
  );
  const control = Children.toArray(header?.props.aside).find(
    (child): child is ReactElement<{ onDeactivate: () => Promise<SiteSubmitResult> }> =>
      isValidElement(child) && child.type === DeactivateSite,
  );
  if (!control) throw new Error("Missing deactivation control");
  return control.props.onDeactivate;
}

it("deactivates the captured site and refreshes shared reads before redirecting", async () => {
  await expect((await deactivationAction())()).rejects.toThrow("REDIRECT");
  expect(mocks.deactivate).toHaveBeenCalledWith(values.slug);
  expect(mocks.tag).toHaveBeenCalledWith("supabase");
  expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
  expect(mocks.redirect).toHaveBeenCalledWith(`/sites/${values.slug}`);
  expect(mocks.tag.mock.invocationCallOrder[0]).toBeLessThan(mocks.revalidate.mock.invocationCallOrder[0]!);
  expect(mocks.revalidate.mock.invocationCallOrder[0]).toBeLessThan(mocks.redirect.mock.invocationCallOrder[0]!);
});

it("checks access again when a stale deactivation control is submitted", async () => {
  const submit = await deactivationAction();
  mocks.authenticated.mockResolvedValue(false);
  expect(await submit()).toHaveProperty("error", "Sign in to deactivate sites.");
  expect(mocks.deactivate).not.toHaveBeenCalled();
  expect(renderToStaticMarkup(await SitePage({ params, searchParams }))).not.toContain("Deactivate site");
});

it.each(["permission", "database", "exception", "missing row"])("returns a retryable %s deactivation failure without expiring caches", async (kind) => {
  if (kind === "exception") mocks.deactivate.mockRejectedValue(new Error("Offline"));
  else mocks.deactivate.mockResolvedValue({ data: null, error: kind === "missing row" ? null : { code: kind === "permission" ? "42501" : "other" } });
  const result = await (await deactivationAction())();
  expect(result.error).toContain(kind === "permission" ? "staff account" : "try again");
  expect(mocks.tag).not.toHaveBeenCalled();
  expect(mocks.redirect).not.toHaveBeenCalled();
});

it("shows persisted deactivation without history and prevents editing", async () => {
  mocks.read.mockResolvedValue({ ...values, deactivated_at: "2026-11-11T00:00:00Z" });
  const html = renderToStaticMarkup(await SitePage({ params, searchParams }));
  expect(html).toContain("Deactivated");
  expect(html).toContain("No planting records yet");
  expect(html).toContain("/sites?state=deactivated");
  expect(html).not.toContain("Deactivate site");
  expect(html).not.toContain(`/sites/${values.slug}/edit`);
  await expect(EditSitePage({ params, searchParams })).rejects.toThrow("NOT_FOUND");
  expect(await generateMetadata({ params })).toEqual({ title: values.name, description: values.description });
});

it("keeps a deactivated site's historical records and quantities on its detail", async () => {
  const detail = (await q.place("whitechapel")) ?? (await q.place((await q.places())[0]!.item.slug))!;
  mocks.read.mockResolvedValue({ ...values, name: detail.place.name, deactivated_at: "2026-11-11T00:00:00Z" });
  mocks.place.mockResolvedValue(detail);
  const html = renderToStaticMarkup(await SitePage({ params, searchParams }));
  expect(html).toContain("Deactivated");
  expect(html).toContain("Recorded plants by season");
  expect(html).toContain(`All ${detail.split.records.toLocaleString("en-NZ")} records`);
});

it("requests the deactivated register and preserves lifecycle state through filters", async () => {
  mocks.list.mockResolvedValue([{ slug: values.slug, name: values.name, is_scheme: false }]);
  const html = renderToStaticMarkup(await SitesPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ state: "deactivated", sort: "name" }) }));
  expect(mocks.list).toHaveBeenCalledWith("deactivated");
  expect(html).toContain('name="state" value="deactivated"');
  expect(html).toContain("state=deactivated&amp;class=keystone&amp;sort=name");
  expect(html).toContain(`href="/sites/${values.slug}"`);
  expect(html).toContain("1 deactivated site");
  expect(html).toMatch(/aria-current="true"[^>]*>Deactivated<\/a>/);
});

it("defaults to the active register and explains an empty deactivated register", async () => {
  await SitesPage({ params: Promise.resolve({}), searchParams });
  expect(mocks.list).toHaveBeenCalledWith("active");
  mocks.list.mockResolvedValue([]);
  const html = renderToStaticMarkup(await SitesPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ state: "deactivated" }) }));
  expect(html).toContain("No deactivated sites");
});
