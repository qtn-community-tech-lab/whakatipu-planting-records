"use server";
/**
 * Loads a site or species for the chat sidebar. Same data as the place and
 * species tools (lib/chat-tools.ts), so the sidebar and the answer agree.
 */
import { placeDetail, speciesAt } from "@/lib/chat-tools";

const SLUG = /^[a-z0-9-]{1,80}$/;

export async function openDetail(kind: "place" | "species", slug: string, place?: string | null, part?: string | null) {
  // Trust boundary: server actions are public endpoints.
  if (!SLUG.test(slug)) return { found: false as const };
  if (kind === "place") return placeDetail(slug);
  // Opened from a card about a site: also show how many were recorded there, and when.
  const at = place && SLUG.test(place) ? place : null;
  return speciesAt(slug, at, at && part ? part.slice(0, 80) : null);
}
