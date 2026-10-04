/**
 * POST /api/chat: streams the WRT data chat. Prompt and tools: lib/chat-tools.ts.
 * Env (.env.local): AI_GATEWAY_API_KEY, optional WRT_CHAT_MODEL.
 */
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { SYSTEM, scopeLine, tools, type ChatMessage, type ChatMeta, type Scope } from "@/lib/chat-tools";

// ponytail: check maxDuration against the Next 16.3.8 route docs in node_modules/next/dist/docs/
export const maxDuration = 60;

const MODEL = process.env.WRT_CHAT_MODEL ?? "openai/gpt-6-luna";
const SLUG = /^[a-z0-9-]{1,80}$/;
const text = (v: unknown) => (typeof v === "string" ? v.replace(/["\n]/g, "").slice(0, 80) || undefined : undefined);

/** Trust boundary: the scope comes from the browser, so keep only well-formed values. */
function readScope(raw: unknown): Scope {
  const s = (raw ?? {}) as Record<string, unknown>;
  const named = (v: unknown) => {
    const o = (v ?? {}) as { slug?: unknown; name?: unknown };
    return typeof o.slug === "string" && SLUG.test(o.slug) && text(o.name) ? { slug: o.slug, name: text(o.name)! } : undefined;
  };
  return {
    place: named(s.place),
    part: text(s.part),
    species: named(s.species),
    season: s.season === "Autumn" || s.season === "Spring" ? s.season : undefined,
    year: typeof s.year === "number" && Number.isInteger(s.year) && s.year >= 2015 && s.year <= 2026 ? s.year : undefined,
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const messages = body?.messages as ChatMessage[] | undefined;
  // Trust boundary: reject anything that isn't a short chat history.
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 60) {
    return new Response("Expected { messages: [...] } with 1–60 messages.", { status: 400 });
  }

  const result = streamText({
    model: MODEL, // a Gateway model string, so swapping models is an env change (WRT_CHAT_MODEL)
    system: `${SYSTEM}\n${scopeLine(readScope(body?.scope))}`,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(6),
    // ponytail: console only; keep a question log if staff use this daily
    onFinish: ({ totalUsage }) => console.info("[chat]", MODEL, totalUsage),
  });

  // Show the real error in the chat instead of "An error occurred." (internal tool, no secrets in these messages)
  const t0 = Date.now();
  return result.toUIMessageStreamResponse({
    // For the Dev panel on /ask.
    messageMetadata: ({ part }): ChatMeta | undefined =>
      part.type === "start" ? { model: MODEL }
      : part.type === "finish" ? { model: MODEL, ms: Date.now() - t0, usage: part.totalUsage }
      : undefined,
    onError: (error) => (error instanceof Error ? error.message : String(error)),
  });
}
