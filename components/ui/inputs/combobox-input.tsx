"use client";

import { useState, type ReactNode } from "react";
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput as ComboboxControl, ComboboxItem, ComboboxList,
} from "@/components/ui/combobox";
import { FormField, type FieldProps } from "./form-field";

/**
 * A labelled, searchable chooser: type in the field, pick from the list that
 * opens underneath. Works with keyboard (arrows, Enter, Escape) and touch.
 *
 * Generic over the item type. The form keeps an id (`getValue`); `getLabel` is
 * what the field shows once something is chosen. Pass `rank` to use your own
 * search (e.g. typo-tolerant, best match first); without it, items whose label
 * contains the typed text are shown.
 */
export function ComboboxInput<Item>({
  label, hint, error, optional, fieldClassName,
  items, value, onChange, getValue, getLabel, rank, renderItem, placeholder, clearLabel, empty, disabled,
}: FieldProps & {
  items: readonly Item[];
  /** The chosen item's value, or "" for none. */
  value: string;
  onChange: (value: string) => void;
  getValue: (item: Item) => string;
  getLabel: (item: Item) => string;
  /** The items to list for a query, best first. */
  rank?: (items: readonly Item[], query: string) => Item[];
  /** How a row looks in the list (defaults to its label). */
  renderItem?: (item: Item) => ReactNode;
  placeholder?: string;
  /** Screen-reader name of the × button. */
  clearLabel?: string;
  /** What to say when nothing matches. */
  empty?: (query: string) => ReactNode;
  /** Greys the field out; the placeholder should say why. */
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const selected = items.find((item) => getValue(item) === value);
  // Once something is chosen the field shows its label; opening the list again
  // should offer everything, not only the item whose name is in the field.
  const search = selected && query === getLabel(selected) ? "" : query;

  return (
    <FormField label={label} hint={hint} error={error} optional={optional} fieldClassName={fieldClassName}>
      {(control) => (
        <Combobox
          items={items}
          filteredItems={rank ? rank(items, search) : undefined}
          value={selected ?? null}
          onValueChange={(next: Item | null) => onChange(next ? getValue(next) : "")}
          itemToStringLabel={getLabel}
          itemToStringValue={getValue}
          isItemEqualToValue={(a: Item, b: Item) => getValue(a) === getValue(b)}
          onInputValueChange={setQuery}
          autoHighlight
          disabled={disabled}
        >
          <ComboboxControl {...control} placeholder={placeholder} clearLabel={clearLabel} />
          <ComboboxContent>
            <ComboboxEmpty>{empty ? empty(search) : "No matches."}</ComboboxEmpty>
            <ComboboxList>
              {(item: Item) => (
                <ComboboxItem key={getValue(item)} value={item}>
                  {renderItem ? renderItem(item) : getLabel(item)}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      )}
    </FormField>
  );
}
