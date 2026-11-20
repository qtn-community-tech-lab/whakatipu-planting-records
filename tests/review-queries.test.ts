import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/db/types";

const mocks = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("@/db/client", () => ({ db: mocks.db }));

import { listOpenQuestions, readQuestionTotals } from "@/db/queries/review";

function respondWith(rows: unknown, status = 200) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(JSON.stringify(rows), {
    status, headers: { "Content-Type": "application/json" },
  }));
  mocks.db.mockResolvedValue(createClient<Database>("https://example.supabase.co", "test-key", {
    auth: { persistSession: false }, global: { fetch },
  }));
  return fetch;
}

describe("review database queries", () => {
  it("lists open questions and excludes those with no actionable notes", async () => {
    const question = { slug: "quantity-check", question: "How many were planted?", ruling: null, ruled_on: null };
    const fetch = respondWith([
      { ...question, notes: [{ count: 2 }] },
      { ...question, slug: "resolved-check", notes: [{ count: 0 }] },
      { ...question, slug: "unused-check", notes: [] },
    ]);

    expect(await listOpenQuestions()).toEqual([{ ...question, openNotes: 2 }]);
    const url = new URL(String(fetch.mock.calls[0]![0]));
    expect(url.pathname).toBe("/rest/v1/questions");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      deactivated_at: "is.null",
      "notes.resolved_at": "is.null",
      "notes.deactivated_at": "is.null",
      "notes.kind": "in.(ruling,confirm)",
      order: "slug.asc",
    });
  });

  it("returns an empty list when all questions have been resolved", async () => {
    respondWith([{ slug: "resolved-check", question: "Confirmed?", ruling: "Yes", ruled_on: "2030-05-01", notes: [{ count: 0 }] }]);
    expect(await listOpenQuestions()).toEqual([]);
  });

  it("returns an empty list when there are no questions", async () => {
    respondWith([]);
    expect(await listOpenQuestions()).toEqual([]);
  });

  it("reads saved totals for an open question without depending on historical seeds", async () => {
    const totals = { question: "quantity-check", lines: 2, plants: 17 };
    const fetch = respondWith([totals]);
    expect(await readQuestionTotals("quantity-check")).toEqual(totals);
    const url = new URL(String(fetch.mock.calls[0]![0]));
    expect(url.pathname).toBe("/rest/v1/totals_by_question");
    expect(url.searchParams.get("question")).toBe("eq.quantity-check");
  });

  it("returns null when a question has no remaining totals", async () => {
    respondWith([]);
    expect(await readQuestionTotals("resolved-check")).toBeNull();
  });

  it.each([listOpenQuestions, () => readQuestionTotals("quantity-check")])("surfaces database errors instead of treating them as an empty result (%#)", async (query) => {
    respondWith({ code: "42501", message: "permission denied", details: null, hint: null }, 403);
    await expect(query()).rejects.toMatchObject({ code: "42501" });
  });
});
