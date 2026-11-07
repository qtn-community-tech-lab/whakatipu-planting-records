/** WRT_DATA_SOURCE picks the CSVs only when it says csv; anything else reads Supabase. */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
const { dataSource } = await import("@/lib/wrt/server");

describe("dataSource", () => {
  const was = process.env.WRT_DATA_SOURCE;
  afterEach(() => {
    if (was === undefined) delete process.env.WRT_DATA_SOURCE;
    else process.env.WRT_DATA_SOURCE = was;
  });

  it.each(["csv", "CSV", "  Csv  "])("reads the CSVs for %j", (value) => {
    process.env.WRT_DATA_SOURCE = value;
    expect(dataSource()).toBe("csv");
  });

  it.each(["supabase", "", "csvs", "postgres"])("reads Supabase for %j", (value) => {
    process.env.WRT_DATA_SOURCE = value;
    expect(dataSource()).toBe("supabase");
  });

  it("reads Supabase when unset", () => {
    delete process.env.WRT_DATA_SOURCE;
    expect(dataSource()).toBe("supabase");
  });
});
