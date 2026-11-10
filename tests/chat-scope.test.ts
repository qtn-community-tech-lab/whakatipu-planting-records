import { assert, describe, expect, it } from "vitest";
import { scopeOf } from "@/components/wrt/ask/chat-scope";
import type { ChatMessage } from "@/lib/wrt/chat-tools";
import { q } from "./helpers";

async function answer(...slugs: string[]): Promise<ChatMessage> {
  const parts = await Promise.all(slugs.map(async (slug): Promise<ChatMessage["parts"][number]> => {
    const detail = await q.season(slug);
    assert.isNotNull(detail);
    const { records, ...summary } = detail;
    return {
      type: "tool-season", toolCallId: slug, state: "output-available", input: { name: slug },
      output: { found: true, ...summary, recordCount: records.length },
    };
  }));
  return { id: slugs.join(","), role: "assistant", parts };
}

describe("chat scope", () => {
  it("has no scope without completed tool results", () => {
    expect(scopeOf([])).toEqual({});
    expect(scopeOf([{ id: "text", role: "assistant", parts: [{ type: "text", text: "Hello" }] }])).toEqual({});
  });

  it("uses the newest completed answer", async () => {
    expect(scopeOf([await answer("autumn-2019"), await answer("spring-2024")]))
      .toEqual({ season: "Spring", year: 2024 });
  });

  it("keeps only fields shared by the tool results in one answer", async () => {
    expect(scopeOf([await answer("autumn-2024", "spring-2024")])).toEqual({ year: 2024 });
    expect(scopeOf([await answer("autumn-2019", "spring-2024")])).toEqual({});
  });
});
