"use client";
/**
 * A searchable chooser for the records filter form. It writes a hidden field
 * with the form's own name and submits the form, as AutoSubmit does for
 * selects, so the page address stays the same shape.
 */
import { useRef, useState } from "react";
import { ComboboxInput } from "@/components/ui/inputs";
import { rankMatches } from "@/lib/wrt/text";

export interface FilterOption {
  value: string;
  name: string;
  /** Macron-free search keys (searchKey). */
  keys: string[];
  /** Second line in the list, such as a botanical name. */
  detail?: string | undefined;
}

const getValue = (o: FilterOption) => o.value;
const getLabel = (o: FilterOption) => o.name;
const renderItem = (o: FilterOption) => (
  <span className="cn-species min-w-0">
    <span className="cn-species__common truncate">{o.name}</span>
    {o.detail && <span className="cn-species__latin truncate">{o.detail}</span>}
  </span>
);

export function FilterChooser({
  name, label, options, value, placeholder, clearLabel, noun,
}: {
  /** The form field name, e.g. "place" or "species". */
  name: string;
  label: string;
  options: FilterOption[];
  /** The current filter value, or "" for all. */
  value: string;
  placeholder: string;
  clearLabel: string;
  /** For the empty message: "No site matches …". */
  noun: string;
}) {
  const [current, setCurrent] = useState(value);
  const field = useRef<HTMLInputElement>(null);

  function choose(next: string) {
    setCurrent(next);
    const input = field.current;
    const form = input?.form;
    if (!input || !form) return;
    // Set it now: React would only update the field after this submit.
    input.value = next;
    if (name === "place") {
      const parcel = form.elements.namedItem("parcel");
      if (parcel instanceof HTMLSelectElement) parcel.value = "";
    }
    form.requestSubmit();
  }

  return (
    <div className="min-w-0">
      <ComboboxInput
        label={label} items={options} value={current} onChange={choose}
        getValue={getValue} getLabel={getLabel} rank={rankMatches} renderItem={renderItem}
        placeholder={placeholder} clearLabel={clearLabel} empty={(q) => `No ${noun} matches “${q}”.`}
      />
      <input ref={field} type="hidden" name={name} value={current} />
    </div>
  );
}
