"use client";
/**
 * Species chooser for one line of the planting-event form: the shared
 * ComboboxInput with the species list. Search matches the topbar search
 * (matchScore: ignores macrons, tolerates typos), so "kowhia" finds Kōwhai.
 * Species already on other lines are left out.
 */
import { ComboboxInput, type FieldProps } from "@/components/ui/inputs";
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

const getValue = (s: SpeciesOption) => s.id;
const getLabel = (s: SpeciesOption) => s.name;
const renderItem = (s: SpeciesOption) => <SpeciesName s={s} />;
const noMatch = (q: string) => `No species matches “${q}”.`;

/** Best match first; with nothing typed, the whole list in its usual order. */
function rankSpecies(items: readonly SpeciesOption[], query: string): SpeciesOption[] {
  const q = query.trim();
  if (!q) return [...items];
  return items
    .map((s) => ({ s, score: matchScore(q, s.keys) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.s.name.localeCompare(b.s.name))
    .map((r) => r.s);
}

export function SpeciesPicker({
  species, value, taken, onChange, ...field
}: FieldProps & {
  species: SpeciesOption[];
  /** Selected species id, or "" for none yet. */
  value: string;
  /** Ids chosen on other lines (left out of the list). */
  taken: ReadonlySet<string>;
  onChange: (speciesId: string) => void;
}) {
  return (
    <ComboboxInput
      {...field}
      items={species}
      value={value}
      onChange={onChange}
      getValue={getValue}
      getLabel={getLabel}
      rank={(items, q) => rankSpecies(items.filter((s) => !taken.has(s.id) || s.id === value), q)}
      renderItem={renderItem}
      placeholder="Search species"
      clearLabel="Clear species"
      empty={noMatch}
    />
  );
}
