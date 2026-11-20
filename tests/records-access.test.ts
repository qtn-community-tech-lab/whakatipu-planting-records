import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticated: vi.fn(), lookups: vi.fn(), places: vi.fn(), seasons: vi.fn(), records: vi.fn(),
}));
vi.mock("@/db/queries/auth", () => ({ requireAuthenticated: mocks.requireAuthenticated }));
vi.mock("@/lib/wrt/server", () => ({
  getWrt: () => ({ lookups: mocks.lookups, places: mocks.places, seasons: mocks.seasons, records: mocks.records }),
}));
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
    mocks.lookups.mockResolvedValue({ places: [], species: [], seasons: [], years: [2025] });
    mocks.places.mockResolvedValue([]);
    mocks.seasons.mockResolvedValue([]);
    mocks.records.mockImplementation(async (filter) => ({ filter, split: emptySplit(), rows: [] }));
  });

  it("checks staff access before reading records data", async () => {
    mocks.requireAuthenticated.mockRejectedValue(new Error("SIGN_IN"));
    await expect(RecordsPage(props())).rejects.toThrow("SIGN_IN");
    expect(mocks.requireAuthenticated).toHaveBeenCalledWith("/records");
    for (const read of [mocks.lookups, mocks.places, mocks.seasons, mocks.records]) expect(read).not.toHaveBeenCalled();
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
    expect(mocks.records).toHaveBeenCalledWith({ year: 2025 });
  });

  it("shows the Records navigation item only to staff", () => {
    expect(renderToStaticMarkup(SidebarNav({ authenticated: false }))).not.toContain('href="/records"');
    expect(renderToStaticMarkup(SidebarNav({ authenticated: true }))).toContain('href="/records"');
  });
});
