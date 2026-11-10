import { createClient } from "@supabase/supabase-js";
import { expect, it, vi } from "vitest";
import type { Database } from "@/db/types";

const mocks = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("@/db/client", () => ({ db: mocks.db }));

import { listSpeciesForPlanting } from "@/db/queries/species";

it("queries active picker fields through the session client without requiring planting history", async () => {
  const rows = [{ slug: "new-species", register_code: null, scientific_name: "New species", suggested_spelling: null, common_name: null, maori_name: null }];
  const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(JSON.stringify(rows), {
    headers: { "Content-Type": "application/json" },
  }));
  mocks.db.mockResolvedValue(createClient<Database>("https://example.supabase.co", "test-key", {
    auth: { persistSession: false }, global: { fetch },
  }));

  expect(await listSpeciesForPlanting()).toEqual(rows);
  expect(mocks.db).toHaveBeenCalledOnce();
  expect(fetch).toHaveBeenCalledOnce();
  const url = new URL(String(fetch.mock.calls[0]![0]));
  expect(url.pathname).toBe("/rest/v1/species");
  expect(url.searchParams.get("deactivated_at")).toBe("is.null");
  expect(url.searchParams.get("select")).toBe("slug,register_code,scientific_name,suggested_spelling,common_name,maori_name");
});
