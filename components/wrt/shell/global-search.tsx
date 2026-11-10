"use client";
import type { AppRoute } from "@/lib/wrt/routes";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { SearchIndex } from "@/lib/wrt/search-index";
import { formatNumber, matchScore, searchKey } from "@/lib/wrt/text";

const LIMIT = 6;

/** Topbar search: sites, species and seasons. Ignores macrons, tolerates typos. */
export function GlobalSearch({ index }: { index: SearchIndex }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target instanceof HTMLElement ? e.target : null;
      if (e.key === "/" && !(t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT"))) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const query = q.trim();
    if (!query) return null;
    const rank = <T extends { score: number; total: number }>(a: T, b: T) => b.score - a.score || b.total - a.total;
    const places = index.places
      .map((p) => ({ ...p, score: matchScore(query, p.keys) }))
      .filter((p) => p.score > 0)
      .sort(rank)
      .slice(0, LIMIT);
    const species = index.species
      .map((s) => ({ ...s, score: matchScore(query, s.keys) }))
      .filter((s) => s.score > 0)
      .sort(rank)
      .slice(0, LIMIT);
    const qk = searchKey(query);
    const seasons = index.seasons
      .filter((s) => searchKey(s.label).startsWith(qk) || String(s.year) === qk || searchKey(s.label) === qk)
      .slice(0, 4);
    return { places, species, seasons };
  }, [q, index]);

  const go = (href: AppRoute) => {
    setOpen(false);
    setQ("");
    inputRef.current?.blur();
    router.push(href);
  };

  return (
    <Command shouldFilter={false} loop className="wrt-topbar__search w-full max-w-[360px]">
      <Popover open={open && !!results} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div>
            <label htmlFor="wrt-search" className="sr-only">Search sites, species and seasons</label>
            <CommandInput
              id="wrt-search"
              ref={inputRef}
              value={q}
              onValueChange={(v) => {
                setQ(v);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter" && q.trim() && results && !results.places.length && !results.species.length && !results.seasons.length) {
                  go(`/search?q=${encodeURIComponent(q.trim())}`);
                }
              }}
              placeholder="Search sites, species, seasons"
              className="!w-full"
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-1.5"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (e.target instanceof Node && inputRef.current?.parentElement?.contains(e.target)) e.preventDefault();
          }}
        >
          <CommandList>
            <CommandEmpty>No site, species or season matches “{q}”.</CommandEmpty>
            {results && results.species.length > 0 && (
              <CommandGroup heading="Species">
                {results.species.map((s) => (
                  <CommandItem key={s.slug} value={`species-${s.slug}`} onSelect={() => go(`/species/${s.slug}`)}>
                    <span className="cn-species min-w-0">
                      <span className={s.isScientific ? "cn-species__common italic" : "cn-species__common"}>{s.name}</span>
                      {!s.isScientific && <span className="cn-species__latin">{s.scientific}</span>}
                    </span>
                    <span className="wrt-muted whitespace-nowrap">{formatNumber(s.total)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {results && results.places.length > 0 && (
              <CommandGroup heading="Sites">
                {results.places.map((p) => (
                  <CommandItem key={p.slug} value={`place-${p.slug}`} onSelect={() => go(`/sites/${p.slug}`)}>
                    <span className="cn-species__common">{p.name}</span>
                    <span className="wrt-muted whitespace-nowrap">{formatNumber(p.total)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {results && results.seasons.length > 0 && (
              <CommandGroup heading="Seasons">
                {results.seasons.map((s) => (
                  <CommandItem key={s.slug} value={`season-${s.slug}`} onSelect={() => go(`/seasons/${s.slug}`)}>
                    <span className="cn-species__common">{s.label}</span>
                    <span className="wrt-muted whitespace-nowrap">{formatNumber(s.total)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {q.trim() && (
              <CommandItem value="all-results" onSelect={() => go(`/search?q=${encodeURIComponent(q.trim())}`)}>
                <span className="cn-link">All results for “{q.trim()}” →</span>
              </CommandItem>
            )}
          </CommandList>
        </PopoverContent>
      </Popover>
    </Command>
  );
}
