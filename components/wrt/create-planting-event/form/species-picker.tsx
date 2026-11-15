"use client";
/**
 * Species chooser for one line of the planting-event form: the shared
 * ComboboxInput with the species list. Search matches the topbar search
 * (rankMatches: ignores macrons, tolerates typos), so "kowhia" finds Kōwhai.
 * Species already on other lines are left out.
 */
import { ComboboxInput, type FieldProps } from "@/components/ui/inputs";
import type { SpeciesOption } from "@/lib/wrt/events/form-options";
import { rankMatches } from "@/lib/wrt/text";
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
      rank={(items, q) => rankMatches(items.filter((s) => !taken.has(s.id) || s.id === value), q)}
      renderItem={renderItem}
      placeholder="Search species"
      clearLabel="Clear species"
      empty={(q) => {
        // Taken species are left out of the list; say so instead of "no match".
        const added = rankMatches(species.filter((s) => taken.has(s.id) && s.id !== value), q)[0];
        return added ? `${added.name} is already on this event.` : `No species matches “${q}”.`;
      }}
    />
  );
}
