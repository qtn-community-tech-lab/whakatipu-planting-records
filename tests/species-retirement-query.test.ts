import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("@/db/client", () => ({ db: mock.db }));
import { deactivateSpecies } from "@/db/queries/species";

type Row = { slug: string; deactivated_at: string | null };
let row: Row | null;
let error: { code: string } | null;
let writes: object[];

beforeEach(() => {
  row = { slug: "test-species", deactivated_at: null };
  error = null;
  writes = [];
  mock.db.mockResolvedValue({ from: (table: string) => {
    expect(table).toBe("species");
    let values: Partial<Row> | undefined;
    let slug: string;
    let activeOnly = false;
    const query = {
      update: (input: Partial<Row>) => { values = input; return query; },
      eq: (key: string, value: string) => { expect(key).toBe("slug"); slug = value; return query; },
      is: (key: string, value: null) => { expect([key, value]).toEqual(["deactivated_at", null]); activeOnly = true; return query; },
      select: () => query,
      maybeSingle: async () => {
        if (error) return { data: null, error };
        if (!row || row.slug !== slug || (activeOnly && row.deactivated_at)) return { data: null, error: null };
        if (values) { writes.push(values); row = { ...row, ...values }; }
        return { data: { ...row }, error: null };
      },
    };
    return query;
  } });
});

describe("deactivateSpecies", () => {
  it("writes only the retirement timestamp and retains it on repeated requests", async () => {
    const first = await deactivateSpecies("test-species");
    expect(first.data?.deactivated_at).toEqual(expect.any(String));
    expect(Object.keys(writes[0])).toEqual(["deactivated_at"]);
    expect(await deactivateSpecies("test-species")).toEqual(first);
    expect(writes).toHaveLength(1);
  });

  it("distinguishes a missing species from an already retired one", async () => {
    expect(await deactivateSpecies("missing")).toEqual({ data: null, error: null });
    expect(writes).toHaveLength(0);
  });

  it("returns database errors without treating them as successful retirement", async () => {
    error = { code: "42501" };
    expect(await deactivateSpecies("test-species")).toEqual({ data: null, error });
    expect(writes).toHaveLength(0);
    expect(row?.deactivated_at).toBeNull();
  });
});
