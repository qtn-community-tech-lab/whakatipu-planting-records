"use client";
import { Camera, Check, MapPin, Pencil } from "lucide-react";
import { useEffect, useState, type Ref } from "react";
import { AreaShape } from "@/components/wrt/shared/area-shape";
import { AreaPicker } from "@/components/wrt/shared/area-picker";
import { NUMBER_FIELD, digits } from "@/components/wrt/shared/fields";
import { ListRow } from "@/components/wrt/shared/list-row";
import { SearchField } from "@/components/wrt/shared/search-field";
import type { EventFormOptions, SpeciesOption } from "@/lib/wrt/events/form-options";
import type { SpeciesSuggestion } from "@/lib/wrt/events/site-suggestions";
import { formatNumber, plantsOrNone, rankMatches } from "@/lib/wrt/text";
import { areaHa, areaName, plantsIn, WHOLE_SITE_KEY, type AreaPick, type DrawnArea, type EventFormState } from "./use-event-form";
import s from "../panel.module.css";
import * as panel from "../panel-classes";

/**
 * What was planted: a search, then one row per species (name, Māori name, how many here before) with a
 * quantity column down the side, like the paper sheets. Every other species is listed underneath; the
 * search filters both lists in place. With drawn areas, plants are listed per area.
 */
export function WhatPlanted({ ref, form, options, suggestions, areas, plantIn, onDrawArea, onAreaFocus, onFocus, onDone, hidden }: {
  /** The form is put away: no area stays brought forward on the map for it. */
  hidden?: boolean | undefined;
  ref?: Ref<HTMLElement> | undefined;
  form: EventFormState; options: EventFormOptions; suggestions: SpeciesSuggestion[];
  onFocus?: (() => void) | undefined;
  /** Opened from the map: Done goes back to it. */
  onDone?: (() => void) | undefined;
  /** With drawn areas, plants are listed per area, or for the site as a whole. */
  areas: readonly DrawnArea[]; onDrawArea?: (() => void) | undefined; onAreaFocus?: ((id: number | null) => void) | undefined;
  /** An area (or the site as a whole) asked for from the map: its list opens. */
  plantIn?: { id: AreaPick } | null | undefined;
}) {
  // Where the plants being typed go: a drawn area or the site as a whole; undefined when the event has no areas.
  const [picked, setPicked] = useState<AreaPick | undefined>(plantIn?.id);
  // A new ask from the map switches the tab (set during render, React's way).
  const [asked, setAsked] = useState(plantIn);
  if (plantIn !== asked) {
    setAsked(plantIn);
    if (plantIn) setPicked(plantIn.id);
  }
  // An area drawn while this list is open (its Add area): its tab opens, so its plants go in next.
  const ids = areas.map((a) => a.id).join();
  const [knownIds, setKnownIds] = useState(ids);
  if (ids !== knownIds) {
    setKnownIds(ids);
    const added = areas.find((a) => !knownIds.split(",").includes(String(a.id)));
    if (added) setPicked(added.id);
  }
  // The site as a whole is only a choice beside drawn areas; on its own, every plant is for the site anyway.
  const whole = picked === WHOLE_SITE_KEY && areas.length > 0;
  const area = whole ? undefined : typeof picked === "number" && areas.some((a) => a.id === picked) ? picked : areas[0]?.id;
  const at = areas.findIndex((a) => a.id === area);
  /** "0.51 ha · 22 plants". */
  const areaLine = (a: DrawnArea) => `${areaHa(a)} · ${plantsOrNone(plantsIn(form.lines, a.id))}`;
  const wholeName = "Whole site";
  const wholeLine = `Not in a drawn area · ${plantsOrNone(plantsIn(form.lines, undefined))}`;
  const current = areas[at]; // undefined for the site as a whole
  const pickName = whole ? wholeName : current ? areaName(current, at) : "";
  // The map shows the area being filled in, so plants never go in the wrong one; leaving the form lets it go.
  useEffect(() => {
    onAreaFocus?.(hidden ? null : area ?? null);
    return () => onAreaFocus?.(null);
  }, [area, hidden, onAreaFocus]);
  // The camera is a placeholder for now: tapping it only says photos come later.
  const [cameraTip, setCameraTip] = useState(false);
  useEffect(() => {
    if (!cameraTip) return;
    const t = setTimeout(() => setCameraTip(false), 2500);
    return () => clearTimeout(t);
  }, [cameraTip]);
  const [query, setQuery] = useState("");
  // Problems shown (Submit): a quantity's problem on a line out of view (another search, another area) brings it into view, so it can take focus.
  const [shownAsk, setShownAsk] = useState(form.problemAsk);
  if (form.problemAsk !== shownAsk) {
    setShownAsk(form.problemAsk);
    const line = form.lines.find((_, i) => form.errors.species?.[i]);
    if (line) {
      setQuery("");
      if (areas.length) setPicked(line.area ?? WHOLE_SITE_KEY);
    }
  }
  const byId = new Map(options.species.map((x) => [x.id, x]));
  const site = new Map(suggestions.map((x) => [x.speciesId, x]));
  const lineOf = (id: string) => form.lines.findIndex((l) => l.speciesId === id && l.area === area);

  // Species added from the list underneath stay there until the search changes, so the box
  // being typed in isn't moved (and rebuilt) mid-number.
  const [kept, setKept] = useState<{ query: string; ids: ReadonlySet<string> }>({ query: "", ids: new Set() });
  const keptIds = kept.query === query ? kept.ids : new Set<string>();

  // The site's species, then anything added from the list underneath. Underneath: every other
  // species, or with a search, the best matches from them. Typing filters both in place.
  const listed = [
    ...suggestions.map((x) => byId.get(x.speciesId)).filter((x): x is SpeciesOption => !!x),
    ...form.lines.filter((l) => l.area === area).map((l) => byId.get(l.speciesId)).filter((x): x is SpeciesOption => !!x && !site.has(x.id) && !keptIds.has(x.id)),
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
    form.append({ speciesId, quantity: value, area });
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
    <section ref={ref} className={panel.group} aria-labelledby="what-planted" onFocus={onFocus}>
      {/* What was planted, and the running count. */}
      <div className="relative z-[2] flex items-end justify-between gap-3 [html[data-keyboard]_&]:items-center">
        <h3 id="what-planted" className="m-0 font-sans text-[19px] leading-[1.2] font-bold text-[var(--text-strong)]">What did you plant?</h3>
        <span className="shrink-0 whitespace-nowrap font-sans text-[13px] leading-[1.3] font-medium text-[var(--text-muted)] [&_b]:font-sans [&_b]:text-[15px] [&_b]:leading-[normal] [&_b]:font-bold [&_b]:tabular-nums [&_b]:text-[var(--text-strong)]" aria-live="polite">
          <b>{formatNumber(form.lines.reduce((t, l) => t + (Number(l.quantity) || 0), 0))}</b> plants · {form.lines.length} species
        </span>
        {onDone && (
          <button type="button" className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] border-0 bg-[var(--cn-green-800)] py-0 pr-[14px] pl-3 font-sans text-[14px] leading-[normal] font-bold text-[var(--cn-white)] hover:bg-[var(--cn-green-900)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cn-green-800)] max-md:min-h-9 max-md:pr-3 max-md:pl-2.5" onClick={onDone}>
            <Check size={16} strokeWidth={2.6} aria-hidden="true" />Done
          </button>
        )}
      </div>
      {areas.length > 0 && (
        // Where these plants went: one chunky dropdown, the area's outline (or the site's pin), name and plants;
        // the other areas, the site as a whole, and Add area in the list it opens. The event's total adds them all up.
        <AreaPicker
          className="mb-2" label="Where the plants went" value={whole ? WHOLE_SITE_KEY : String(area)}
          buttonLabel={`Planted ${whole ? "at" : "area:"} ${pickName}, ${whole ? wholeLine : current ? areaLine(current) : ""}. Change where`}
          onChange={(key) => setPicked(key === WHOLE_SITE_KEY ? WHOLE_SITE_KEY : Number(key))}
          footer={onDrawArea && { label: "Draw area", onClick: onDrawArea, icon: <Pencil size={18} strokeWidth={2.4} aria-hidden="true" /> }}
          options={[
            ...areas.map((a, i) => ({ key: String(a.id), title: areaName(a, i), subtitle: areaLine(a), lead: (size: number) => <AreaShape pts={a.pts} size={size} onMap /> })),
            // Plants that went in across the site, not in one of the drawn areas.
            { key: WHOLE_SITE_KEY, title: wholeName, subtitle: wholeLine, lead: (size: number) => <span className="grid shrink-0 place-items-center bg-[var(--surface-soft)] text-[var(--cn-green-800)]" style={{ width: size, height: size, borderRadius: Math.round(size * 0.27) }}><MapPin size={Math.round(size * 0.46)} strokeWidth={2.2} aria-hidden="true" /></span> },
          ]}
        />
      )}

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
