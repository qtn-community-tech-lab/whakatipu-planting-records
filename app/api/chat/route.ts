/**
 * POST /api/chat: streams the WRT data chat. Prompt and tools: lib/wrt/chat-tools.ts.
 * Env (.env.local): AI_GATEWAY_API_KEY, optional WRT_CHAT_MODEL.
 */
import { convertToModelMessages, safeValidateUIMessages, smoothStream, stepCountIs, streamText } from "ai";
import { SYSTEM, scopeLine, tools, type ChatMessage, type ChatMeta, type Scope } from "@/lib/wrt/chat-tools";
import { SLUG } from "@/lib/wrt/text";

// ponytail: check maxDuration against the Next 16.3.8 route docs in node_modules/next/dist/docs/
export const maxDuration = 60;

const MODEL = process.env.WRT_CHAT_MODEL ?? "openai/gpt-6-luna";
const text = (v: unknown) => (typeof v === "string" ? v.replace(/["\n]/g, "").slice(0, 80) || undefined : undefined);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Trust boundary: the scope comes from the browser, so keep only well-formed values. */
function readScope(raw: unknown): Scope {
  const s = isObject(raw) ? raw : {};
  const named = (v: unknown) => {
    if (!isObject(v)) return undefined;
    const name = text(v.name);
    return typeof v.slug === "string" && SLUG.test(v.slug) && name ? { slug: v.slug, name } : undefined;
  };
  const place = named(s.place);
  const part = text(s.part);
  const species = named(s.species);
  return {
    ...(place ? { place } : {}),
    ...(part ? { part } : {}),
    ...(species ? { species } : {}),
    ...(s.season === "Autumn" || s.season === "Spring" ? { season: s.season } : {}),
    ...(typeof s.year === "number" && Number.isInteger(s.year) && s.year >= 2000 && s.year <= 2026 ? { year: s.year } : {}),
  };
}

export async function POST(req: Request): Promise<Response> {
  const body: unknown = await req.json().catch(() => null);
  const rawMessages = isObject(body) ? body.messages : undefined;
  // Trust boundary: reject anything that isn't a short chat history.
  if (!Array.isArray(rawMessages) || rawMessages.length === 0 || rawMessages.length > 60) {
    return new Response("Expected { messages: [...] } with 1–60 messages.", { status: 400 });
  }
  const validated = await safeValidateUIMessages<ChatMessage>({ messages: rawMessages, tools });
  if (!validated.success) return new Response("Invalid chat messages.", { status: 400 });
  const messages = validated.data;

  const result = streamText({
    model: MODEL, // a Gateway model string, so swapping models is an env change (WRT_CHAT_MODEL)
    system: `${SYSTEM}\n${scopeLine(readScope(isObject(body) ? body.scope : undefined))}`,
    // With tools, earlier results go back to the model as their short briefs, not the full card data.
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    stopWhen: stepCountIs(6),
    experimental_transform: smoothStream({ chunking: "word" }), // even word-by-word text
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
