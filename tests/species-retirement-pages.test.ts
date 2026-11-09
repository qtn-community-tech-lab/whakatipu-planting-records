import { Children, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SpeciesSubmitResult } from "@/db/types";

const mocks = vi.hoisted(() => ({
  source: vi.fn(), authenticated: vi.fn(), deactivate: vi.fn(), species: vi.fn(), list: vi.fn(),
  tag: vi.fn(), revalidate: vi.fn(), redirect: vi.fn(),
}));
vi.mock("@/lib/wrt/server", () => ({
  dataSource: mocks.source, getWrt: () => ({ species: mocks.species, speciesList: mocks.list }),
}));
vi.mock("@/db/queries/access", () => ({ isAuthenticated: mocks.authenticated }));
vi.mock("@/db/queries/species", () => ({ deactivateSpecies: mocks.deactivate }));
vi.mock("next/cache", () => ({ updateTag: mocks.tag, revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect, notFound: () => { throw new Error("NOT_FOUND"); },
  useRouter: () => ({ push: vi.fn() }), usePathname: () => "/species",
}));

import DetailPage from "@/app/species/[slug]/page";
import RegisterPage from "@/app/species/page";
import { RetireSpecies } from "@/components/wrt/species/retire-species";
import { q } from "./helpers";

const rows = await q.speciesList();
const detail = (await q.species(rows[0].item.slug))!;
const retiredAt = "2026-11-09T00:00:00.000Z";
const page = () => DetailPage({ params: Promise.resolve({ slug: detail.species.slug }) });
type Submit = () => Promise<SpeciesSubmitResult>;
async function action() {
  const control = Children.toArray((await page()).props.children).find((child) =>
    isValidElement<{ onRetire: Submit }>(child) && child.type === RetireSpecies);
  if (!isValidElement<{ onRetire: Submit }>(control)) throw new Error("Retirement control missing");
  return control.props.onRetire;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.source.mockReturnValue("supabase");
  mocks.authenticated.mockResolvedValue(true);
  mocks.species.mockResolvedValue(detail);
  mocks.list.mockResolvedValue(rows);
  mocks.deactivate.mockResolvedValue({ data: { slug: detail.species.slug, deactivated_at: retiredAt }, error: null });
  mocks.redirect.mockImplementation(() => { throw new Error("REDIRECT"); });
});

describe("species retirement action", () => {
  it("retires the selected species, invalidates shared reads and opens its detail", async () => {
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
    expect(await submit()).toHaveProperty("error", "Sign in to retire species.");
    expect(mocks.deactivate).not.toHaveBeenCalled();
    expect(renderToStaticMarkup(await page())).not.toContain("Retire species");
  });

  it("returns a database failure without redirecting or expiring caches", async () => {
    mocks.deactivate.mockResolvedValue({ data: null, error: { code: "42501" } });
    expect(await (await action())()).toHaveProperty("error");
    expect(mocks.tag).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("shows the persisted retired state on reopening and hides edit and retire actions", async () => {
    mocks.species.mockResolvedValue({ ...detail, species: { ...detail.species, deactivatedAt: retiredAt } });
    const html = renderToStaticMarkup(await page());
    expect(html).not.toContain("Retire species");
    expect(html).toContain("Retired");
    expect(html).not.toContain(`/species/${detail.species.slug}/edit`);
  });
});

describe("species register lifecycle views", () => {
  beforeEach(() => {
    mocks.list.mockResolvedValue(rows.map((row, index) => index === 0
      ? { ...row, item: { ...row.item, deactivatedAt: retiredAt } } : row));
  });

  it.each([undefined, "retired"])("separates active and retired entries (state: %s)", async (state) => {
    const html = renderToStaticMarkup(await RegisterPage({ searchParams: Promise.resolve({ state }) }));
    const speciesLink = `href="/species/${detail.species.slug}"`;
    if (state === "retired") expect(html).toContain(speciesLink);
    else expect(html).not.toContain(speciesLink);
    expect(html).toContain("140,068 recorded plants across all historical species");
  });
});
