import { createClient } from "@supabase/supabase-js";
import { beforeEach, expect, it, vi } from "vitest";
import type { Database } from "@/db/types";

const mocks = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("@/db/client", () => ({ db: mocks.db }));
import {
  createSite,
  updateSite,
  createPlantingArea,
  updatePlantingArea,
  listPlantingAreas,
  readPlantingArea,
} from "@/db/queries/sites";

const fetch = vi.fn<typeof globalThis.fetch>();
beforeEach(() => {
  fetch.mockReset();
  mocks.db.mockResolvedValue(
    createClient<Database>("https://example.supabase.co", "test-key", {
      auth: { persistSession: false },
      global: { fetch },
    }),
  );
});

function request() {
  const [input, options] = fetch.mock.calls[0]!;
  return {
    url: new URL(String(input)),
    options,
    body: options?.body ? JSON.parse(String(options.body)) : undefined,
  };
}

it("creates within the supplied parent without writing unrelated metadata", async () => {
  fetch.mockResolvedValue(new Response(JSON.stringify({ slug: "east-bank" })));
  await createPlantingArea("reserve", {
    slug: "east-bank",
    name: "East",
    description: "",
    site: "other",
    lat: -45,
  } as Parameters<typeof createPlantingArea>[1]);
  const { url, options, body } = request();
  expect(url.pathname).toBe("/rest/v1/areas");
  expect(url.searchParams.get("select")).toBe("slug");
  expect(options?.method).toBe("POST");
  expect(body).toEqual({
    slug: "east-bank",
    site: "reserve",
    name: "East",
    description: "",
  });
});

it("constrains updates to both fixed identifiers and changes only name and description", async () => {
  fetch.mockResolvedValue(new Response(JSON.stringify({ slug: "east-bank" })));
  await updatePlantingArea("reserve", "east-bank", {
    name: "Corrected",
    description: "",
    slug: "replacement",
    site: "other",
    wrt_number: "9A",
    lat: -45,
  } as Parameters<typeof updatePlantingArea>[2]);
  const { url, options, body } = request();
  expect(options?.method).toBe("PATCH");
  expect(url.searchParams.get("site")).toBe("eq.reserve");
  expect(url.searchParams.get("slug")).toBe("eq.east-bank");
  expect(url.searchParams.has("deactivated_at")).toBe(false);
  expect(body).toEqual({ name: "Corrected", description: "" });
});

it("lists active areas directly from the register in name order", async () => {
  fetch.mockResolvedValue(new Response(JSON.stringify([])));
  expect(await listPlantingAreas("reserve")).toEqual([]);
  const { url } = request();
  expect(url.pathname).toBe("/rest/v1/areas");
  expect(url.searchParams.get("site")).toBe("eq.reserve");
  expect(url.searchParams.get("deactivated_at")).toBe("is.null");
  expect(url.searchParams.get("order")).toBe("name.asc");
});

it("reads an area under its parent and permits expected absence", async () => {
  fetch.mockResolvedValue(new Response(JSON.stringify([])));
  expect(await readPlantingArea("other", "east-bank")).toBeNull();
  const { url } = request();
  expect(url.searchParams.get("site")).toBe("eq.other");
  expect(url.searchParams.get("slug")).toBe("eq.east-bank");
});


it("writes only site columns when passed a complete create submission", async () => {
  fetch.mockResolvedValue(new Response(JSON.stringify({ slug: "reserve" })));
  const values = { slug: "reserve", name: "Reserve", description: "", areas: [{ slug: "east-bank", name: "East", description: "", existing: false }] };
  await createSite(values);
  expect(request().body).toEqual({ slug: "reserve", name: "Reserve", description: "" });
});

it("writes only site columns when passed a complete edit submission", async () => {
  fetch.mockResolvedValue(new Response(JSON.stringify({ slug: "reserve" })));
  const values = { name: "Reserve", description: "", areas: [] };
  await updateSite("reserve", values);
  expect(request().body).toEqual({ name: "Reserve", description: "" });
});
