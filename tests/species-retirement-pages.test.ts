import { Children, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SpeciesSubmitResult } from "@/db/types";

const mocks = vi.hoisted(() => ({
  authenticated: vi.fn(), deactivate: vi.fn(), species: vi.fn(), list: vi.fn(),
  tag: vi.fn(), revalidate: vi.fn(), redirect: vi.fn(),
}));
vi.mock("@/lib/wrt/server", () => ({
  getWrt: () => ({ species: mocks.species, speciesList: mocks.list }),
}));
vi.mock("@/db/queries/auth", () => ({ isAuthenticated: mocks.authenticated }));
vi.mock("@/db/queries/species", () => ({ deactivateSpecies: mocks.deactivate }));
vi.mock("next/cache", () => ({ updateTag: mocks.tag, revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect, notFound: () => { throw new Error("NOT_FOUND"); },
  useRouter: () => ({ push: vi.fn() }), usePathname: () => "/species",
}));

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
  const control = Children.toArray((await page()).props.children).find((child) =>
    isValidElement<{ onDeactivate: Submit }>(child) && child.type === DeactivateSpecies);
  if (!isValidElement<{ onDeactivate: Submit }>(control)) throw new Error("Deactivation control missing");
  return control.props.onDeactivate;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.authenticated.mockResolvedValue(true);
  mocks.species.mockResolvedValue(detail);
  mocks.list.mockResolvedValue(rows);
  mocks.deactivate.mockResolvedValue({ data: { slug: detail.species.slug, deactivated_at: deactivatedAt }, error: null });
  mocks.redirect.mockImplementation(() => { throw new Error("REDIRECT"); });
});

describe("species deactivation action", () => {
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
    expect(renderToStaticMarkup(await page())).not.toContain("Deactivate Species");
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
    expect(html).not.toContain("Deactivate Species");
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
