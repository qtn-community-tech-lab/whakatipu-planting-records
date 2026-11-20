import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticated: vi.fn(), context: vi.fn(), summary: vi.fn(), page: vi.fn(),
}));
vi.mock("@/db/queries/auth", () => ({ requireAuthenticated: mocks.requireAuthenticated }));
vi.mock("@/db/queries/records", () => ({ createRecordsQueries: () => ({ context: mocks.context, summary: mocks.summary, page: mocks.page }) }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/", redirect: () => { throw new Error("REDIRECT"); },
}));

import RecordsPage from "@/app/records/page";
import { SidebarNav } from "@/components/wrt/shell/sidebar-nav";
import { emptySplit } from "@/lib/wrt/queries";

const props = (search: Record<string, string | string[]> = {}) => ({
  params: Promise.resolve({}), searchParams: Promise.resolve(search),
});

describe("staff records access", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAuthenticated.mockResolvedValue(undefined);
    mocks.context.mockResolvedValue({ lookups: { places: [], species: [], seasons: [], years: [2025] }, places: [] });
    mocks.summary.mockResolvedValue({ split: emptySplit(), siteCount: 0, speciesCount: 0,
      seasons: [], sites: [], species: [], themes: [], cells: [], rowsBy: "species" });
    mocks.page.mockResolvedValue([]);
  });

  it("checks staff access before reading records data", async () => {
    mocks.requireAuthenticated.mockRejectedValue(new Error("SIGN_IN"));
    await expect(RecordsPage(props())).rejects.toThrow("SIGN_IN");
    expect(mocks.requireAuthenticated).toHaveBeenCalledWith("/records");
    for (const read of [mocks.context, mocks.summary, mocks.page]) expect(read).not.toHaveBeenCalled();
  });

  it("preserves filters, sort and page in the sign-in return destination", async () => {
    mocks.requireAuthenticated.mockRejectedValue(new Error("SIGN_IN"));
    const search = { year: "2025", sort: "plants", page: "2", q: ["Kōwhai", "ignored"] };
    await expect(RecordsPage(props(search))).rejects.toThrow("SIGN_IN");
    const destination = new URL(mocks.requireAuthenticated.mock.calls[0]![0], "https://example.org");
    expect(destination.pathname).toBe("/records");
    expect(Object.fromEntries(destination.searchParams)).toEqual({ year: "2025", sort: "plants", page: "2", q: "Kōwhai" });
  });

  it("lets approved staff load the filtered records", async () => {
    await RecordsPage(props({ year: "2025" }));
    expect(mocks.summary).toHaveBeenCalledWith({ year: 2025 });
    expect(mocks.page).not.toHaveBeenCalled();
  });

  it("fetches only the requested sorted page while keeping aggregate totals", async () => {
    const totals = { ...emptySplit(), records: 123 };
    mocks.summary.mockResolvedValue({ split: totals, siteCount: 1, speciesCount: 1,
      seasons: [], sites: [], species: [], themes: [], cells: [], rowsBy: "species" });
    await RecordsPage(props({ year: "2025", sort: "plants", page: "2" }));
    expect(mocks.page).toHaveBeenCalledExactlyOnceWith({ year: 2025 }, 2, "plants");
  });

  it("clamps an out-of-range page using the total matching record count", async () => {
    mocks.summary.mockResolvedValue({ split: { ...emptySplit(), records: 123 }, siteCount: 1, speciesCount: 1,
      seasons: [], sites: [], species: [], themes: [], cells: [], rowsBy: "species" });
    await RecordsPage(props({ page: "999" }));
    expect(mocks.page).toHaveBeenCalledExactlyOnceWith({}, 3, "season");
  });

  it("shows the Records navigation item only to staff", () => {
    expect(renderToStaticMarkup(SidebarNav({ authenticated: false }))).not.toContain('href="/records"');
    expect(renderToStaticMarkup(SidebarNav({ authenticated: true }))).toContain('href="/records"');
  });
});
