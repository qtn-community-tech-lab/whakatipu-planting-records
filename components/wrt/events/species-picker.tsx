"use client";
/**
 * Searchable species chooser for one line of the planting-event form.
 * Same matching as the topbar search (matchScore: ignores macrons, tolerates
 * typos), so "kowhia" finds Kōwhai. Species already on other lines are hidden.
 */
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { SpeciesOption } from "@/lib/wrt/events/form-options";
import { matchScore } from "@/lib/wrt/text";
import { cn } from "@/lib/utils";

export function SpeciesName({ s }: { s: SpeciesOption }) {
  return (
    <span className="cn-species min-w-0">
      <span className={cn("cn-species__common truncate", s.isScientific && "italic")}>{s.name}</span>
      {!s.isScientific && <span className="cn-species__latin truncate">{s.scientific}</span>}
    </span>
  );
}

export function SpeciesPicker({
  id, species, value, taken, onChange, invalid, describedBy,
}: {
  id: string;
  species: SpeciesOption[];
  /** Selected species id, or "" for none yet. */
  value: string;
  /** Ids chosen on other lines (hidden from the list). */
  taken: ReadonlySet<string>;
  onChange: (speciesId: string) => void;
  invalid?: boolean;
  /** Id of the line's error message. */
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = species.find((s) => s.id === value);

  const results = useMemo(() => {
    const available = species.filter((s) => !taken.has(s.id) || s.id === value);
    const query = q.trim();
    if (!query) return available;
    return available
      .map((s) => ({ s, score: matchScore(query, s.keys) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.s.name.localeCompare(b.s.name))
      .map((r) => r.s);
  }, [species, taken, value, q]);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn("wrt-select ev-species-trigger", invalid && "ev-invalid")}
          data-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-haspopup="listbox"
        >
          {selected ? <SpeciesName s={selected} /> : <span className="text-[var(--text-placeholder)]">Choose a species</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(380px,calc(100vw-32px))] p-1.5">
        <Command shouldFilter={false} loop>
          <CommandInput value={q} onValueChange={setQ} placeholder="Search by any name" className="!w-full mb-1" autoFocus />
          <CommandList>
            <CommandEmpty>No species matches “{q}”.</CommandEmpty>
            {results.map((s) => (
              <CommandItem key={s.id} value={s.id} onSelect={() => { onChange(s.id); setOpen(false); setQ(""); }}>
                <SpeciesName s={s} />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
