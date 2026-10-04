"use client";
/**
 * The composer's scope bar on /ask.
 * Scope is what the last answer looked at (a site, a part, a species, a season). It's shown as chips,
 * can be cleared, and is sent with each question so follow-ups stay on it (scopeLine in lib/chat-tools.ts).
 */
import type { ChatMessage, Scope } from "@/lib/chat-tools";

const KEYS = ["place", "part", "species", "season", "year"] as const;

/** The scope of one tool result, or null if it doesn't set one (search does not; list and data_quality clear it). */
function scopeOfPart(p: ChatMessage["parts"][number]): Scope | null {
  if (!("state" in p) || p.state !== "output-available") return null;
  switch (p.type) {
    case "tool-records": {
      const { filter: f, names: n } = p.output;
      return {
        place: f.place && n.place ? { slug: f.place, name: n.place } : undefined, part: n.part ?? undefined,
        species: f.species && n.species ? { slug: f.species, name: n.species } : undefined, season: f.season, year: f.year,
      };
    }
    case "tool-place": return p.output.found ? { place: { slug: p.output.place.slug, name: p.output.place.name } } : null;
    case "tool-species": {
      if (!p.output.found) return null;
      const h = p.output.here;
      return {
        place: h ? { slug: h.place, name: h.placeName } : undefined, part: h?.part ?? undefined,
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
  for (let i = messages.length - 1; i >= 0; i--) {
    const all = messages[i].parts.map(scopeOfPart).filter((x): x is Scope => !!x);
    if (!all.length) continue;
    const same = (k: (typeof KEYS)[number]) => all.every((s) => JSON.stringify(s[k]) === JSON.stringify(all[0][k]));
    return Object.fromEntries(KEYS.filter(same).map((k) => [k, all[0][k]]).filter(([, v]) => v !== undefined)) as Scope;
  }
  return {};
}

/** "Gorge Rd Wetlands" and "Spring 2019": the scope in words. */
export const scopeWhere = (s: Scope) => s.part ?? s.place?.name;
export const scopeWhen = (s: Scope) => [s.season, s.year].filter(Boolean).join(" ");

/** Chips for the scope; × clears one (a site and its part go together, so do season and year). */
export function ScopeBar({ scope, onClear }: { scope: Scope; onClear: (key: "place" | "species" | "when") => void }) {
  const chips = [
    scope.place && { key: "place" as const, label: scope.part ? `${scope.place.name} › ${scope.part}` : scope.place.name },
    scope.species && { key: "species" as const, label: scope.species.name },
    scopeWhen(scope) && { key: "when" as const, label: scopeWhen(scope) },
  ].filter((c) => !!c);
  return (
    <div className="wrt-chat__scope">
      <span className="wrt-chat__scope-label">Scope</span>
      {chips.length ? chips.map((c) => (
        <span key={c.key} className="wrt-chat__scopechip">
          {c.label}
          <button type="button" aria-label={`Clear ${c.label}`} onClick={() => onClear(c.key)}>×</button>
        </span>
      )) : <span className="wrt-chat__scope-empty">All sites, species and seasons</span>}
    </div>
  );
}
