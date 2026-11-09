import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SpeciesDetail, SpeciesSummary } from "@/lib/wrt/queries";
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
import PhotosPage from "@/app/species/photos/page";
import { RetireSpecies } from "@/components/wrt/species/retire-species";
import { SpeciesCard } from "@/components/wrt/species/species-card";
import { q } from "./helpers";

function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<Record<string, unknown>>(child)) return [];
    return [child, ...elements(child.props.children as ReactNode)];
  });
}

let detail: SpeciesDetail;
let rows: SpeciesSummary[];
const retiredAt = "2026-11-09T00:00:00.000Z";
const page = () => DetailPage({ params: Promise.resolve({ slug: detail.species.slug }) });
async function action() {
  const control = elements(await page()).find((el) => el.type === RetireSpecies)!;
  return control.props.onRetire as () => Promise<SpeciesSubmitResult>;
}

beforeAll(async () => {
  rows = await q.speciesList();
  detail = (await q.species(rows[0].item.slug))!;
});

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
  it("only retires on confirmation, invalidates shared reads and opens the species", async () => {
    const submit = await action();
    expect(mocks.deactivate).not.toHaveBeenCalled();
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
    expect(elements(await page()).some((el) => el.type === RetireSpecies)).toBe(false);
  });

  it("hides controls in CSV mode and rejects its direct action", async () => {
    const submit = await action();
    mocks.source.mockReturnValue("csv");
    expect(elements(await page()).some((el) => el.type === RetireSpecies)).toBe(false);
    expect(await submit()).toHaveProperty("error", expect.stringContaining("CSV"));
    expect(mocks.deactivate).not.toHaveBeenCalled();
  });

  it.each(["missing", "error", "exception"])("reports %s without redirecting or expiring caches", async (kind) => {
    const submit = await action();
    if (kind === "exception") mocks.deactivate.mockRejectedValue(new Error("offline"));
    else mocks.deactivate.mockResolvedValue({ data: null, error: kind === "error" ? { code: "42501" } : null });
    expect(await submit()).toHaveProperty("error", expect.any(String));
    expect(mocks.tag).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("shows the persisted retired state on reopening and hides edit and retire actions", async () => {
    mocks.species.mockResolvedValue({ ...detail, species: { ...detail.species, deactivatedAt: retiredAt } });
    const tree = await page();
    expect(elements(tree).some((el) => el.type === RetireSpecies)).toBe(false);
    const html = renderToStaticMarkup(tree);
    expect(html).toContain("Retired");
    expect(html).toContain("Its historical records and recorded quantities are retained.");
    expect(html).not.toContain(`/species/${detail.species.slug}/edit`);
  });
});

describe("species register lifecycle views", () => {
  beforeEach(() => {
    mocks.list.mockResolvedValue(rows.map((row, index) => index === 0
      ? { ...row, item: { ...row.item, deactivatedAt: retiredAt } } : row));
  });

  it("defaults to active species while retaining the whole-history total", async () => {
    const tree = await RegisterPage({ searchParams: Promise.resolve({}) });
    const cards = elements(tree).filter((el) => el.type === SpeciesCard);
    expect(cards).toHaveLength(rows.length - 1);
    expect(cards.some((el) => (el.props.row as SpeciesSummary).item.slug === detail.species.slug)).toBe(false);
    const html = renderToStaticMarkup(tree);
    expect(html).toContain("140,068 recorded plants across all historical species");
    expect(html).toContain("recorded plants for listed species");
  });

  it("shows retired species explicitly and preserves state and filters in navigation and search", async () => {
    const tree = await RegisterPage({ searchParams: Promise.resolve({ state: "retired", q: detail.species.scientificName, sort: "name", view: "grid" }) });
    const cards = elements(tree).filter((el) => el.type === SpeciesCard);
    expect(cards).toHaveLength(1);
    expect((cards[0].props.row as SpeciesSummary).item.slug).toBe(detail.species.slug);
    const links = elements(tree).filter((el) => el.props.href && String(el.props.href).includes("state=retired"));
    expect(links.some((el) => String(el.props.href).includes("sort=name") && String(el.props.href).includes("view=grid") && String(el.props.href).includes("q="))).toBe(true);
    expect(elements(tree).some((el) => el.type === "input" && el.props.name === "state" && el.props.value === "retired")).toBe(true);
  });

  it("excludes retired species from the reference guide", async () => {
    const html = renderToStaticMarkup(await PhotosPage());
    expect(html).not.toContain(`id="guide-${detail.species.slug}"`);
  });
});
