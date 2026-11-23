import { afterEach, describe, expect, it, vi } from "vitest";
import { readLayoutSummary } from "@/db/queries/layout";

const empty = { siteCount: 0, speciesCount: 0, records: 0, seasons: [], places: [], species: [] };

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("public layout query", () => {
  it("makes one uncached RPC including the complete history", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(empty), {
      headers: { "Content-Type": "application/json" },
    }));
    expect(await readLayoutSummary()).toEqual(empty);
    expect(fetch).toHaveBeenCalledOnce();
    const [input, init] = fetch.mock.calls[0]!;
    expect(String(input)).toBe("https://example.supabase.co/rest/v1/rpc/read_layout_summary");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ show_review: true });
    expect(init?.cache).toBe("no-store");
    expect(init?.next?.revalidate).toBeUndefined();
  });

  it("rejects an incomplete response rather than hiding missing history", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { headers: { "Content-Type": "application/json" } }));
    await expect(readLayoutSummary()).rejects.toThrow();
  });
});
