"use client";
import { Camera } from "lucide-react";
import { useEffect, useState } from "react";
import { NUMBER_FIELD, digits } from "@/components/wrt/shared/fields";
import { ListRow } from "@/components/wrt/shared/list-row";
import { SearchField } from "@/components/wrt/shared/search-field";
import type { EventFormOptions, SpeciesOption } from "@/lib/wrt/events/form-options";
import type { SpeciesSuggestion } from "@/lib/wrt/events/site-suggestions";
import { formatNumber, rankMatches } from "@/lib/wrt/text";
import type { EventFormState } from "./use-event-form";
import s from "../panel.module.css";
import * as panel from "../panel-classes";

/**
 * What was planted: a search, then one row per species (name, Māori name, how many here before) with a
 * quantity column down the side, like the paper sheets. Every other species is listed underneath; the
 * search filters both lists in place.
 */
export function WhatPlanted({ form, options, suggestions, onFocus }: {
  form: EventFormState; options: EventFormOptions; suggestions: SpeciesSuggestion[];
  onFocus?: (() => void) | undefined;
}) {
  // The camera is a placeholder for now: tapping it only says photos come later.
  const [cameraTip, setCameraTip] = useState(false);
  useEffect(() => {
    if (!cameraTip) return;
    const t = setTimeout(() => setCameraTip(false), 2500);
    return () => clearTimeout(t);
  }, [cameraTip]);
  const [query, setQuery] = useState("");
  // Problems shown (Submit): a quantity's problem on a line out of view (another search) brings it into view, so it can take focus.
  const [shownAsk, setShownAsk] = useState(form.problemAsk);
  if (form.problemAsk !== shownAsk) {
    setShownAsk(form.problemAsk);
    if (form.lines.some((_, i) => form.errors.species?.[i])) setQuery("");
  }
  const byId = new Map(options.species.map((x) => [x.id, x]));
  const site = new Map(suggestions.map((x) => [x.speciesId, x]));
  const lineOf = (id: string) => form.lines.findIndex((l) => l.speciesId === id);

  // Species added from the list underneath stay there until the search changes, so the box
  // being typed in isn't moved (and rebuilt) mid-number.
  const [kept, setKept] = useState<{ query: string; ids: ReadonlySet<string> }>({ query: "", ids: new Set() });
  const keptIds = kept.query === query ? kept.ids : new Set<string>();

  // The site's species, then anything added from the list underneath. Underneath: every other
  // species, or with a search, the best matches from them. Typing filters both in place.
  const listed = [
    ...suggestions.map((x) => byId.get(x.speciesId)).filter((x): x is SpeciesOption => !!x),
    ...form.lines.map((l) => byId.get(l.speciesId)).filter((x): x is SpeciesOption => !!x && !site.has(x.id) && !keptIds.has(x.id)),
  ];
  const shown = query.trim() ? rankMatches(listed, query) : listed;
  const listedIds = new Set(listed.map((x) => x.id));
  const more = query.trim()
    ? rankMatches(options.species, query).filter((x) => !listedIds.has(x.id)).slice(0, 15)
    : options.species.filter((x) => !listedIds.has(x.id));

  /** Typing a number adds the species; clearing it takes the species off again. */
  const setPlanted = (speciesId: string, value: string) => {
    const i = lineOf(speciesId);
    if (i >= 0) return value ? form.update(i, { ...form.lines[i]!, quantity: value }) : form.remove(i);
    if (!value) return;
    if (!listedIds.has(speciesId)) setKept({ query, ids: new Set([...keptIds, speciesId]) });
    form.append({ speciesId, quantity: value });
  };

  const speciesError = form.errors.species?.message ?? form.errors.species?.root?.message;
  // Submit was pressed with nothing entered: say so at the list, and mark the first box so focus lands there.
  const nothingYet = !form.lines.length && Object.keys(form.errors).length > 0;

  const row = (sp: SpeciesOption, first: boolean) => {
    const sg = site.get(sp.id);
    const i = lineOf(sp.id);
    const qtyError = i >= 0 ? form.errors.species?.[i]?.quantity?.message : undefined;
    const name = sg ? sg.common ?? sg.scientific : sp.name;
    const italic = sg ? !sg.common : sp.isScientific;
    // Māori name under the common one; the scientific name when they're the same or there isn't one.
    const second = sg
      ? (sg.maori && sg.maori !== name ? sg.maori : sg.common ? <i>{sg.scientific}</i> : null)
      : (!sp.isScientific ? <i>{sp.scientific}</i> : null);
    return (
      <li key={sp.id} className={s.row} data-picked={i >= 0 || undefined} data-invalid={qtyError || (first && nothingYet) ? true : undefined}>
        <ListRow
          size="md" photo={sg?.photo ?? null} initial={name.charAt(0)} tintKey={sp.id}
          title={italic ? <i>{name}</i> : name} subtitle={second}
          // How many went in here before: context, so quiet and unlabelled; hovering (or a screen reader) says what it is.
          figure={sg ? <span title={`${formatNumber(sg.here)} planted here before`}><span aria-hidden="true">{formatNumber(sg.here)}</span><span className="sr-only">{formatNumber(sg.here)} planted here before</span></span> : ""}
          end={
            <input
              className={s.rowQty} aria-label={`${name}: how many planted`}
              aria-invalid={qtyError || (first && nothingYet) ? true : undefined}
              {...NUMBER_FIELD} maxLength={6} enterKeyHint="next" data-enter-next="" placeholder="+"
              value={form.lines[i]?.quantity ?? ""}
              onChange={(e) => setPlanted(sp.id, digits(e.target.value))}
            />
          }
        />
        {qtyError && <span className={panel.rowError}>{qtyError}</span>}
      </li>
    );
  };

  return (
    <section className={panel.group} aria-labelledby="what-planted" onFocus={onFocus}>
      {/* What was planted, and the running count. */}
      <div className="relative z-[2] flex items-end justify-between gap-3 [html[data-keyboard]_&]:items-center">
        <h3 id="what-planted" className="m-0 font-sans text-[19px] leading-[1.2] font-bold text-[var(--text-strong)]">What did you plant?</h3>
        <span className="shrink-0 whitespace-nowrap font-sans text-[13px] leading-[1.3] font-medium text-[var(--text-muted)] [&_b]:font-sans [&_b]:text-[15px] [&_b]:leading-[normal] [&_b]:font-bold [&_b]:tabular-nums [&_b]:text-[var(--text-strong)]" aria-live="polite">
          <b>{formatNumber(form.lines.reduce((t, l) => t + (Number(l.quantity) || 0), 0))}</b> plants · {form.lines.length} species
        </span>
      </div>

      <div className="sticky top-0 z-[1] flex flex-col gap-2 bg-[var(--surface-app)] px-0 pt-0 pb-2 shadow-[0_-18px_0_var(--surface-app)]" data-pinned="">
        <SearchField label="Search species" placeholder="Search species" value={query} onChange={setQuery}>
          <button
            type="button" className="grid size-10 cursor-pointer place-items-center rounded-[var(--radius-row)] border-0 bg-[var(--surface-soft)] text-[var(--cn-green-800)] aria-disabled:cursor-help aria-disabled:opacity-55" aria-disabled="true" title="Photos are coming next"
            aria-label="Take a photo of what was planted (coming next)" onClick={() => setCameraTip(true)}
          >
            <Camera size={20} strokeWidth={2} />
          </button>
        </SearchField>
        {cameraTip && <p className="m-0 self-end rounded-[var(--radius-row)] bg-[var(--cn-green-900)] px-3 py-2 font-sans text-[13px] leading-[1.3] font-semibold text-[var(--text-on-dark)]" role="status">Photos of what was planted are coming next.</p>}
        {nothingYet ? <p className={s.problem} role="alert">Enter how many went in for at least one species.</p>
          : speciesError && <p className={s.problem} role="alert">{speciesError}</p>}
      </div>

      {/* The site's own species first (the order says they were planted here before), then the rest under a quiet divider. */}
      {shown.length > 0 && <ul className={panel.rows}>{shown.map((sp, n) => row(sp, n === 0))}</ul>}
      {more.length > 0 && (
        <>
          {shown.length > 0 && <p className="mx-0 mt-1.5 -mb-1 font-sans text-[14px] leading-[1.3] font-semibold text-[var(--text-muted)]">{query.trim() ? "Other species" : "All species"}</p>}
          <ul className={panel.rows}>{more.map((sp, n) => row(sp, shown.length === 0 && n === 0))}</ul>
        </>
      )}
      {query.trim() && shown.length === 0 && more.length === 0 && (
        <p className={panel.empty}>No species matches “{query.trim()}”.</p>
      )}
    </section>
  );
}
