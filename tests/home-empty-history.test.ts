import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { WrtQueries } from "@/lib/wrt/queries";
import { createQueries } from "@/lib/wrt/queries";
import { repo } from "./helpers";
import { records } from "./fixtures/planting";

const mocks = vi.hoisted(() => ({ queries: null as WrtQueries | null }));
vi.mock("@/lib/wrt/server", () => ({ getWrt: () => mocks.queries, reviewShown: async () => true }));
vi.mock("@/lib/wrt/public-server", () => ({ getPublicWrt: () => mocks.queries }));

import Home from "@/app/page";

describe("homepage with empty history", () => {
  it("renders an empty state without requiring first and last seasons", async () => {
    mocks.queries = createQueries({ ...repo, listSeasons: async () => [], listRecords: async () => [] });
    const html = renderToStaticMarkup(await Home());
    expect(html).toContain("No planting history yet");
    expect(html).toContain("Refresh after the historical import completes");
  });

  it("renders the overview when all recorded quantities are zero", async () => {
    mocks.queries = createQueries({ ...repo, listRecords: async () => records.map((record) => ({ ...record, quantity: 0 })) });
    const html = renderToStaticMarkup(await Home());
    expect(html).toContain("Season by season");
    expect(html).not.toContain("No planting history yet");
  });
});
