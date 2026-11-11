import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as AI from "ai";
import type { ChatMessage } from "@/lib/wrt/chat-tools";

const { streamText } = vi.hoisted(() => ({
  streamText: vi.fn(() => ({
    toUIMessageStreamResponse: () => new Response("stream"),
  })),
}));

vi.mock("ai", async (original) => ({
  ...await original<typeof AI>(),
  streamText,
}));
vi.mock("@/lib/wrt/chat-tools", () => ({
  SYSTEM: "Test system prompt",
  scopeLine: vi.fn(() => "Test scope"),
  tools: {},
}));

const { POST } = await import("@/app/api/chat/route");
const { scopeLine } = await import("@/lib/wrt/chat-tools");

const message = {
  id: "question", role: "user", parts: [{ type: "text", text: "Tell me about Lake Hayes" }],
} satisfies ChatMessage;
const request = (body: unknown) => new Request("http://localhost/api/chat", {
  method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
});

describe("typed chat request boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([null, 42, {}, { messages: [] }, { messages: Array.from({ length: 61 }, () => message) }])(
    "rejects missing or oversized histories: %j", async (body) => {
      expect((await POST(request(body))).status).toBe(400);
      expect(streamText).not.toHaveBeenCalled();
    },
  );

  it("rejects malformed message parts before starting a stream", async () => {
    const response = await POST(request({ messages: [{ ...message, parts: [{ type: "text", text: 42 }] }] }));
    expect(response.status).toBe(400);
    expect(streamText).not.toHaveBeenCalled();
  });

  it("validates messages and keeps only well-formed scope values", async () => {
    const response = await POST(request({ messages: [message], scope: {
      place: { slug: "lake-hayes", name: "Lake Hayes" },
      species: { slug: "../invalid", name: "Invalid" },
      part: 42, season: "Autumn", year: 2024,
    } }));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("stream");
    expect(scopeLine).toHaveBeenCalledWith({
      place: { slug: "lake-hayes", name: "Lake Hayes" }, season: "Autumn", year: 2024,
    });
    expect(streamText).toHaveBeenCalledOnce();
  });
});
