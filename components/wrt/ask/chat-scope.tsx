"use client";
/**
 * Scope on /ask: what the last answer looked at (a site, a part, a species, a season). It's shown as chips
 * in the composer (chat-composer.tsx), can be cleared, and is sent with each question so follow-ups stay on it
 * (scopeLine in lib/wrt/chat-tools.ts).
 */
import type { ChatMessage, Scope } from "@/lib/wrt/chat-tools";

const KEYS = ["place", "part", "species", "season", "year"] as const;

/** The scope of one tool result, or null if it doesn't set one (search does not; list and data_quality clear it). */
function scopeOfPart(p: ChatMessage["parts"][number]): Scope | null {
  if (!("state" in p) || p.state !== "output-available") return null;
  switch (p.type) {
    case "tool-records": {
      const { filter: f, names: n } = p.output;
      return {
        ...(f.place && n.place ? { place: { slug: f.place, name: n.place } } : {}),
        ...(n.part ? { part: n.part } : {}),
        ...(f.species && n.species ? { species: { slug: f.species, name: n.species } } : {}),
        ...(f.season ? { season: f.season } : {}),
        ...(f.year !== undefined ? { year: f.year } : {}),
      };
    }
    case "tool-place": return p.output.found ? { place: { slug: p.output.place.slug, name: p.output.place.name } } : null;
    case "tool-species": {
      if (!p.output.found) return null;
      const h = p.output.here;
      return {
        ...(h ? { place: { slug: h.place, name: h.placeName } } : {}),
        ...(h?.part ? { part: h.part } : {}),
        species: { slug: p.output.species.slug, name: p.output.species.displayName },
      };
    }
    case "tool-season": return p.output.found ? { season: p.output.season.name, year: p.output.season.year } : null;
    case "tool-list": case "tool-data_quality": return {};
    default: return null;
  }
}

/**
 * Scope from the newest answer that looked something up. When one answer looked up several things
 * (three plants at a site), only what they share is kept: the site, not one of the plants.
 */
export function scopeOf(messages: ChatMessage[]): Scope {
  for (const message of messages.toReversed()) {
    const all = message.parts.map(scopeOfPart).filter((x): x is Scope => x !== null);
    const first = all[0];
    if (!first) continue;
    const shared: Scope = {};
    function copyShared<Key extends keyof Scope>(key: Key) {
      const value = first?.[key];
      if (value !== undefined && all.every((s) => JSON.stringify(s[key]) === JSON.stringify(value))) {
        shared[key] = value;
      }
    }
    KEYS.forEach(copyShared);
    return shared;
  }
  return {};
}

/** "Gorge Rd Wetlands" and "Spring 2019": the scope in words. */
export const scopeWhere = (s: Scope) => s.part ?? s.place?.name;
export const scopeWhen = (s: Scope) => [s.season, s.year].filter(Boolean).join(" ");
