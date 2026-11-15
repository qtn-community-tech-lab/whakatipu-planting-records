import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SpeciesSubmitResult } from "@/db/types";

const mocks = vi.hoisted(() => ({
  read: vi.fn(), update: vi.fn(), authenticated: vi.fn(), deactivate: vi.fn(), species: vi.fn(), list: vi.fn(),
  tag: vi.fn(), revalidate: vi.fn(), redirect: vi.fn(),
}));
vi.mock("@/lib/wrt/server", () => ({
  getWrt: () => ({ species: mocks.species, speciesList: mocks.list }),
}));
vi.mock("@/db/queries/access", () => ({ isAuthenticated: mocks.authenticated }));
vi.mock("@/db/queries/species", () => ({ deactivateSpecies: mocks.deactivate, readSpeciesForEdit: mocks.read, updateSpecies: mocks.update }));
vi.mock("next/cache", () => ({ updateTag: mocks.tag, revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect, notFound: () => { throw new Error("NOT_FOUND"); },
  useRouter: () => ({ push: vi.fn() }), usePathname: () => "/species",
}));

vi.mock("@/components/wrt/species/SpeciesForm", () => ({ SpeciesForm: () => null }));

import EditPage from "@/app/species/[slug]/edit/page";
import DetailPage from "@/app/species/[slug]/page";
import RegisterPage from "@/app/species/page";
import { DeactivateSpecies } from "@/components/wrt/species/deactivate-species";
import { q } from "./helpers";
import { defined } from "./assertions";

const rows = await q.speciesList();
const detail = (await q.species(defined(rows[0]).item.slug))!;
const deactivatedAt = "2026-11-09T00:00:00.000Z";
const page = () => DetailPage({ searchParams: Promise.resolve({}), params: Promise.resolve({ slug: detail.species.slug }) });
type Submit = () => Promise<SpeciesSubmitResult>;
async function action() {
  const edit = await EditPage({ params: Promise.resolve({ slug: detail.species.slug }), searchParams: Promise.resolve({}) });
  function findControl(children: ReactNode): ReactElement<{ onDeactivate: Submit }> | undefined {
    for (const child of Children.toArray(children)) {
      if (!isValidElement<{ children?: ReactNode; aside?: ReactNode }>(child)) continue;
      if (child.type === DeactivateSpecies) return child as ReactElement<{ onDeactivate: Submit }>;
      const nested = findControl(child.props.children) ?? findControl(child.props.aside);
      if (nested) return nested;
    }
    return undefined;
  }
  const control = findControl(edit.props.children);
  if (!control) throw new Error("Deactivation control missing");
  return control.props.onDeactivate;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.authenticated.mockResolvedValue(true);
  mocks.read.mockResolvedValue({ slug: detail.species.slug, scientific_name: detail.species.scientificName, common_name: detail.species.commonName, maori_name: detail.species.maoriName, updated_at: "2026-11-15T00:00:00Z" });
  mocks.species.mockResolvedValue(detail);
  mocks.list.mockResolvedValue(rows);
  mocks.deactivate.mockResolvedValue({ data: { slug: detail.species.slug, deactivated_at: deactivatedAt }, error: null });
  mocks.redirect.mockImplementation(() => { throw new Error("REDIRECT"); });
});

describe("species deactivation action", () => {
  it("offers deactivation only in the authenticated edit page", async () => {
    const props = { params: Promise.resolve({ slug: detail.species.slug }), searchParams: Promise.resolve({}) };
    expect(renderToStaticMarkup(await page())).not.toContain("Deactivate species");
    expect(renderToStaticMarkup(await EditPage(props))).toContain("Deactivate species");
    mocks.authenticated.mockResolvedValue(false);
    expect(renderToStaticMarkup(await EditPage(props))).not.toContain("Deactivate species");
  });

  it("deactivates the selected species, invalidates shared reads and opens its detail", async () => {
    const submit = await action();
    await expect(submit()).rejects.toThrow("REDIRECT");
    expect(mocks.deactivate).toHaveBeenCalledWith(detail.species.slug);
    expect(mocks.tag).toHaveBeenCalledWith("supabase");
    expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
    expect(mocks.redirect).toHaveBeenCalledWith(`/species/${detail.species.slug}`);
  });

  it("checks access again when submitting a stale control", async () => {
    const submit = await action();
    mocks.authenticated.mockResolvedValue(false);
    expect(await submit()).toHaveProperty("error", "Sign in to deactivate species.");
    expect(mocks.deactivate).not.toHaveBeenCalled();
    expect(renderToStaticMarkup(await page())).not.toContain("Deactivate species");
  });

  it("returns a database failure without redirecting or expiring caches", async () => {
    mocks.deactivate.mockResolvedValue({ data: null, error: { code: "42501" } });
    expect(await (await action())()).toHaveProperty("error");
    expect(mocks.tag).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("shows the persisted deactivated state on reopening and hides edit and deactivate actions", async () => {
    mocks.species.mockResolvedValue({ ...detail, species: { ...detail.species, deactivatedAt: deactivatedAt } });
    const html = renderToStaticMarkup(await page());
    expect(html).not.toContain("Deactivate species");
    expect(html).toContain("Deactivated");
    expect(html).not.toContain(`/species/${detail.species.slug}/edit`);
  });
});

describe("species register lifecycle views", () => {
  beforeEach(() => {
    mocks.list.mockResolvedValue(rows.map((row, index) => index === 0
      ? { ...row, item: { ...row.item, deactivatedAt: deactivatedAt } } : row));
  });

  it.each([undefined, "deactivated"])("separates active and deactivated entries (state: %s)", async (state) => {
    const html = renderToStaticMarkup(await RegisterPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ state }) }));
    const speciesLink = `href="/species/${detail.species.slug}"`;
    if (state === "deactivated") expect(html).toContain(speciesLink);
    else expect(html).not.toContain(speciesLink);
    expect(html).toContain("370 recorded plants across all historical species");
  });
});
