"use client";
/**
 * The planting-event form for the map view: the same three steps, state and
 * checks as EventForm (useEventForm), laid out for a panel over the map.
 *
 * 1. Where and when: the site the map picked, as a confirmed card, then the
 *    date and season.
 * 2. What was planted: a search on top, then one row per species (name, Māori
 *    name, how many here before) with a quantity column down the side, like the
 *    paper sheets. The search filters the rows in place and brings in any other
 *    species. The host widens the panel for this step (onStepChange).
 * 3. Check and submit: a flat summary, then notes, then Submit.
 */
import Image from "next/image";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { FormField, TextareaInput } from "@/components/ui/inputs";
import type { EventFormOptions, SpeciesOption } from "@/lib/wrt/events/form-options";
import { formatPlantedOn } from "@/lib/wrt/events/season";
import type { SpeciesSuggestion } from "@/lib/wrt/events/site-suggestions";
import { EVENT_STEPS, LAST_STEP, STEP } from "@/lib/wrt/events/steps";
import { describeEvent, WHOLE_SITE, type EventSummary } from "@/lib/wrt/events/summary";
import { EVENT_SEASONS, type EventSeason } from "@/lib/wrt/events/types";
import { NOTES_MAX } from "@/lib/wrt/events/validate";
import { formatNumber, rankMatches } from "@/lib/wrt/text";
import { cn } from "@/lib/utils";
import { SitePartPicker, SitePicker } from "./site-picker";
import { useEventForm, type EventFormState } from "./use-event-form";
import s from "./map-event-form.module.css";

interface MapEventFormProps {
  options: EventFormOptions;
  /** NZ today, "YYYY-MM-DD" (from the server so it matches the validator). */
  today: string;
  /** Site to start on ("" for none yet). */
  initialPlace: string;
  /** The planted area from the map, shown in step 1 and on the check step. Left out until the map draws one. */
  plantedArea?: ReactNode;
  /** The chosen site's most planted species, for step 2. */
  suggestions: SpeciesSuggestion[];
  /** Tells the host which step is showing, so it can size the panel and move the map. */
  onStepChange?: (step: number) => void;
  /** A site picked outside the form (a pin on the map): the form switches to it. */
  picked?: { slug: string } | null;
  /** Tells the host when the site or part changes, so the map can move its pin. */
  onPlaceChange?: (placeSlug: string, parcelId: string | null) => void;
  /** A new location dropped on the map, [longitude, latitude]. Shown in the form; not saved yet. */
  spot?: [number, number] | null;
  /** Start dropping a new location on the map, and take it off again. */
  onAddSpot?: () => void;
  onRemoveSpot?: () => void;
  /** "Draw the planted area": for now the host just shows the map (drawing comes next). */
  onDrawArea?: () => void;
}

export function MapEventForm(props: MapEventFormProps) {
  const [round, setRound] = useState(0);
  return <Form key={round} {...props} onStartAnother={() => setRound((r) => r + 1)} />;
}

function Form({ options, today, initialPlace, plantedArea, suggestions, picked, onStepChange, onPlaceChange, spot, onAddSpot, onRemoveSpot, onDrawArea, onStartAnother }: MapEventFormProps & {
  onStartAnother: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const form = useEventForm({ options, today, formRef, headingRef, initialPlace });
  const { step } = form;

  useEffect(() => { onStepChange?.(form.preview ? LAST_STEP : step); }, [step, form.preview, onStepChange]);
  useEffect(() => { if (form.placeSlug) onPlaceChange?.(form.placeSlug, form.parcelId); }, [form.placeSlug, form.parcelId, onPlaceChange]);
  // Take up each new pick once, so choosing another site in the form afterwards isn't undone.
  const applied = useRef(picked);
  useEffect(() => {
    if (!picked || picked === applied.current) return;
    applied.current = picked;
    form.chooseSite(picked.slug);
  });

  if (form.preview) {
    return <Preview summary={describeEvent(form.preview, options)} location={spot ? spotLabel(spot) : null} onBack={form.closePreview} onStartAnother={onStartAnother} />;
  }

  const next = step < LAST_STEP ? `Next: ${EVENT_STEPS[step + 1].title}` : "Submit planting event";
  const hasErrors = Object.keys(form.errors).length > 0;

  return (
    <form ref={formRef} className={s.form} onSubmit={form.submit} noValidate aria-label="New planting event">
      <header className={s.head}>
        <Steps form={form} />
        <div className={s.titleRow}>
          <h2 ref={headingRef} tabIndex={-1} className={s.title}>{EVENT_STEPS[step].title}</h2>
          {step === STEP.whatPlanted && (
            <span className={s.total} aria-live="polite">
              <b>{formatNumber(form.total)}</b>
              <span>plants · {form.lines.filter((l) => l.speciesId).length} species</span>
            </span>
          )}
        </div>
        {/* Which planting this is, carried over from step 1. */}
        {step === STEP.whatPlanted && (
          <p className={s.context}>
            {/* The site is in the panel's title already. */}
            <span>{formatPlantedOn(form.plantedOn)} · {form.season} {form.seasonYear}</span>
            <button type="button" className={s.inlineLink} onClick={() => form.goTo(STEP.whereWhen)}>Change</button>
          </p>
        )}
      </header>

      <div className={s.scroll}>
        {/* Step 2 says what's wrong at its list instead. */}
        {hasErrors && step !== STEP.whatPlanted && (
          <div className="cn-callout cn-callout--risk cn-callout--sm" role="alert">
            {form.errors.form ?? "Some details need fixing. They are marked below."}
          </div>
        )}
        {step === STEP.whereWhen && <WhereWhen form={form} options={options} today={today} plantedArea={plantedArea} spot={spot ?? null} onAddSpot={onAddSpot} onRemoveSpot={onRemoveSpot} onDrawArea={onDrawArea} />}
        {step === STEP.whatPlanted && <WhatPlanted form={form} options={options} suggestions={suggestions} />}
        {step === STEP.check && (
          <>
            {plantedArea ?? (
              // Where the planted area's map snippet goes once areas can be drawn.
              <div className={s.areaPlaceholder}>
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" /></svg>
                <b>Planted area</b>
                <span>A map of the area goes here once it can be drawn.</span>
              </div>
            )}
            {form.checkedEvent
              ? <Summary summary={describeEvent(form.checkedEvent, options)} location={spot ? spotLabel(spot) : null} onChange={form.goTo} />
              : (
                <div className="cn-callout cn-callout--risk cn-callout--sm">
                  Some details need fixing before they can be checked.{" "}
                  <button type="button" className="cn-btn cn-btn--soft cn-btn--sm" onClick={form.showFirstProblem}>Show me</button>
                </div>
              )}
            <TextareaInput
              label="Notes" optional rows={3} maxLength={NOTES_MAX} value={form.notes} error={form.err("notes")}
              placeholder="Who planted, conditions, anything WRT should know"
              onChange={(e) => form.setNotes(e.target.value)}
            />
          </>
        )}
      </div>

      <footer className={s.foot}>
        {step > 0
          ? <button type="button" className={s.back} onClick={form.back}>Back</button>
          : <span className={s.count}>Step 1 of {EVENT_STEPS.length}</span>}
        <button type="submit" className={s.next}>
          {next}
          {step < LAST_STEP && (
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          )}
        </button>
      </footer>
      {step === STEP.check && <p className={s.note}>Prototype: Submit shows a preview. Nothing is saved yet.</p>}
    </form>
  );
}

/** Bars with numbered labels; steps already reached can be revisited. */
function Steps({ form }: { form: EventFormState }) {
  return (
    <ol className={s.steps} aria-label="Steps">
      {EVENT_STEPS.map((st, i) => {
        const state = i === form.step ? "current" : i <= form.furthest ? "reached" : "later";
        const label = (
          <>
            <span className={s.stepBar} />
            <span className={s.stepLabel}>
              <span className={s.stepN} aria-hidden="true">{state === "reached" && i < form.step ? "✓" : i + 1}</span>
              <span className={s.stepTitle}>{st.title}</span>
            </span>
          </>
        );
        return (
          <li key={st.title} className={s.step} data-state={state} aria-current={state === "current" ? "step" : undefined}>
            {state === "reached"
              ? <button type="button" className={s.stepLink} onClick={() => form.goTo(i)}>{label}</button>
              : <span className={s.stepLink}>{label}</span>}
          </li>
        );
      })}
    </ol>
  );
}

function WhereWhen({ form, options, today, plantedArea, spot, onAddSpot, onRemoveSpot, onDrawArea }: {
  form: EventFormState; options: EventFormOptions; today: string; plantedArea: ReactNode;
  spot: [number, number] | null; onAddSpot?: () => void; onRemoveSpot?: () => void; onDrawArea?: () => void;
}) {
  const { err } = form;
  // A chosen site shows as a card; the pickers show until there is one, on an error, or after Change.
  const [changing, setChanging] = useState(false);
  const editingSite = changing || !form.site || !!err("placeSlug") || !!err("parcelId");
  const part = form.site?.parts.find((p) => p.id === form.parcelId);
  const dateRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <section className={s.group} aria-label="Where">
        <h3 className={s.groupTitle}>Where</h3>
        {editingSite ? (
          <div className={s.fields}>
            <SitePicker label="Site" sites={options.sites} value={form.placeSlug} error={err("placeSlug")} onChange={form.chooseSite} />
            <SitePartPicker label="Part of site" optional site={form.site} value={form.parcelId} error={err("parcelId")} onChange={form.setParcelId} />
            {form.site && <button type="button" className={s.link} onClick={() => setChanging(false)}>Done</button>}
          </div>
        ) : (
          <div className={s.card}>
            <span className={s.cardIcon} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
            </span>
            <span className={s.cardText}>
              <b>{form.site?.name}</b>
              <span>{part ? `Part: ${part.name}` : form.site?.parts.length ? "The site as a whole" : "The whole site (it has one part)"}</span>
            </span>
            <button type="button" className={s.link} onClick={() => setChanging(true)}>Change</button>
          </div>
        )}
        {spot ? (
          <div className={cn(s.card, s.spotCard)}>
            <span className={s.cardIcon} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
            </span>
            <span className={s.cardText}>
              <b>New location</b>
              <span>{spotLabel(spot)}</span>
            </span>
            {onAddSpot && <button type="button" className={s.link} onClick={onAddSpot}>Move</button>}
            {onRemoveSpot && <button type="button" className={s.link} onClick={onRemoveSpot}>Remove</button>}
          </div>
        ) : onAddSpot && (
          <button type="button" className={s.addRow} onClick={onAddSpot}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            Add a new location
            <span>Line it up on the map</span>
          </button>
        )}
        {plantedArea ?? (
          <button type="button" className={s.addRow} disabled={!onDrawArea} onClick={onDrawArea}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 6l9-2 5 9-7 7-8-5z" /></svg>
            Draw the planted area
            <span className={s.soon}>Next</span>
          </button>
        )}
      </section>

      <section className={s.group} aria-label="When">
        <h3 className={s.groupTitle}>When</h3>
        <FormField label="Planting date" error={err("plantedOn")}>
          {(control) => (
            // A card like the site's; the real date input sits inside it, and Change opens its picker.
            <div className={s.card}>
              <span className={s.cardIcon} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
              </span>
              <span className={s.cardText}>
                <b>{form.plantedOn ? formatPlantedOn(form.plantedOn) : "Choose a date"}</b>
                <span>{form.plantedOn === today ? "Today" : "Planting date"}</span>
              </span>
              <input
                {...control} ref={dateRef} type="date" className={s.dateInput} value={form.plantedOn} max={today}
                onChange={(e) => form.changeDate(e.target.value)}
              />
              <button type="button" className={s.link} onClick={() => dateRef.current?.showPicker?.()}>Change</button>
            </div>
          )}
        </FormField>
        <FormField
          label="Counts towards" group error={err("season") ?? err("seasonYear")}
          hint={form.seasonChosen ? "Chosen by you." : "Suggested from the date. Change it if WRT counts this planting in another season."}
        >
          {(control, labelId) => (
            <div className={s.seasonRow}>
              <div role="radiogroup" aria-labelledby={labelId} aria-describedby={control["aria-describedby"]} className={s.segment}>
                {EVENT_SEASONS.map((x) => (
                  <button
                    key={x} type="button" role="radio" aria-checked={form.season === x}
                    className={s.segmentItem} onClick={() => form.chooseSeason(x as EventSeason)}
                  >
                    {x}
                  </button>
                ))}
              </div>
              <input
                aria-label="Season year" className={s.year} type="number" inputMode="numeric" min={2015} max={2100}
                value={form.seasonYear} onChange={(e) => form.changeSeasonYear(e.target.value)}
              />
            </div>
          )}
        </FormField>
      </section>
    </>
  );
}

function WhatPlanted({ form, options, suggestions }: {
  form: EventFormState; options: EventFormOptions; suggestions: SpeciesSuggestion[];
}) {
  const { err } = form;
  const [query, setQuery] = useState("");
  const byId = new Map(options.species.map((x) => [x.id, x]));
  const site = new Map(suggestions.map((x) => [x.speciesId, x]));
  const lineOf = (id: string) => form.lines.findIndex((l) => l.speciesId === id);

  // The site's species, then anything added from the search. Typing filters them in
  // place and brings in matches from the whole species list underneath.
  const listed = [
    ...suggestions.map((x) => byId.get(x.speciesId)).filter((x): x is SpeciesOption => !!x),
    ...form.lines.map((l) => byId.get(l.speciesId)).filter((x): x is SpeciesOption => !!x && !site.has(x.id)),
  ];
  const shown = query.trim() ? rankMatches(listed, query) : listed;
  const listedIds = new Set(listed.map((x) => x.id));
  const more = query.trim() ? rankMatches(options.species, query).filter((x) => !listedIds.has(x.id)).slice(0, 15) : [];

  /** Typing a number adds the species; clearing it takes the species off again. */
  const setPlanted = (speciesId: string, value: string) => {
    const i = lineOf(speciesId);
    if (i < 0) {
      if (value.trim()) form.addSpecies(speciesId, value);
      return;
    }
    const l = form.lines[i];
    if (value.trim()) form.updateLine(l.key, { quantity: value });
    else if (form.lines.length > 1) form.removeLine(l.key);
    else form.updateLine(l.key, { speciesId: "", quantity: "" });
  };

  // Next was pressed with nothing entered: say so at the list, and mark the first box so focus lands there.
  const nothingYet = !form.lines.some((l) => l.speciesId) && Object.keys(form.errors).length > 0;

  const row = (sp: SpeciesOption, first: boolean) => {
    const sg = site.get(sp.id);
    const i = lineOf(sp.id);
    const qtyError = i >= 0 ? err(`species.${i}.quantity`) : undefined;
    const name = sg ? sg.common ?? sg.scientific : sp.name;
    const italic = sg ? !sg.common : sp.isScientific;
    // Māori name under the common one; the scientific name when they're the same or there isn't one.
    const second = sg
      ? (sg.maori && sg.maori !== name ? sg.maori : sg.common ? <i>{sg.scientific}</i> : null)
      : (!sp.isScientific ? <i>{sp.scientific}</i> : null);
    return (
      <li key={sp.id} className={s.row} data-picked={i >= 0 || undefined} data-invalid={qtyError || (first && nothingYet) ? true : undefined}>
        <span className={s.rowPhoto} aria-hidden="true">
          {sg?.photo
            ? <Image src={sg.photo.src} alt="" fill sizes="44px" unoptimized style={{ objectFit: "cover", objectPosition: sg.photo.focalPoint }} title={sg.photo.credit} />
            : name.charAt(0)}
        </span>
        <span className={s.rowName}>
          <b className={cn(italic && "italic")}>{name}</b>
          <span>{second}</span>
        </span>
        <span className={s.rowHere}>{sg ? formatNumber(sg.here) : ""}</span>
        <input
          className={s.rowQty} aria-label={`${name}: how many planted`}
          aria-invalid={qtyError || (first && nothingYet) ? true : undefined}
          type="number" inputMode="numeric" min={1} step={1} placeholder="–"
          value={i >= 0 ? form.lines[i].quantity : ""}
          onChange={(e) => setPlanted(sp.id, e.target.value)}
        />
        {qtyError && <span className={s.rowError}>{qtyError}</span>}
      </li>
    );
  };

  return (
    <section className={s.group} aria-label="Species and how many">
      <div className={s.searchBar}>
        <label className={s.search}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <span className="sr-only">Search species</span>
          <input type="search" value={query} placeholder="Search species" onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
          {query && <button type="button" className={s.searchClear} aria-label="Clear search" onClick={() => setQuery("")}>×</button>}
        </label>
        {nothingYet && <p className={s.problem} role="alert">Enter how many went in for at least one species.</p>}
        {err("species") && <p className={s.problem} role="alert">{err("species")}</p>}
      </div>

      {shown.length > 0 && (
        <>
          <div className={s.rowsHead} aria-hidden="true">
            <span className={s.groupTitle}>{query.trim() ? "On this list" : `Planted at ${form.site?.name ?? "this site"} before`}</span>
            <span>Here</span>
            <span>Planted</span>
          </div>
          <ul className={s.rows}>{shown.map((sp, n) => row(sp, n === 0))}</ul>
        </>
      )}
      {more.length > 0 && (
        <>
          <div className={s.rowsHead} aria-hidden="true"><span className={s.groupTitle}>Other species</span></div>
          <ul className={s.rows}>{more.map((sp, n) => row(sp, shown.length === 0 && n === 0))}</ul>
        </>
      )}
      {query.trim() && shown.length === 0 && more.length === 0 && (
        <p className={s.empty}>No species matches “{query.trim()}”.</p>
      )}
    </section>
  );
}

/** The checked event as a flat list: what Check and submit and the preview both show. */
function Summary({ summary, location, onChange }: { summary: EventSummary; location: string | null; onChange?: (step: number) => void }) {
  const group = (title: string, step: number, rows: ReactNode) => (
    <section className={s.sumGroup}>
      <div className={s.sumHead}>
        <h3>{title}</h3>
        {onChange && (
          <button type="button" className={s.inlineLink} onClick={() => onChange(step)} aria-label={`Change ${title.toLowerCase()}`}>Change</button>
        )}
      </div>
      <dl className={s.sumList}>{rows}</dl>
    </section>
  );
  const row = (term: ReactNode, value: ReactNode, total = false) => (
    <div className={cn(s.sumRow, total && s.sumTotal)}><dt>{term}</dt><dd>{value}</dd></div>
  );
  return (
    <div className={s.summary}>
      {group("Where and when", STEP.whereWhen, <>
        {row("Site", summary.part === WHOLE_SITE ? summary.site : `${summary.site} · ${summary.part}`)}
        {location && row("New location", location)}
        {row("Date", summary.date)}
        {row("Season", summary.season)}
      </>)}
      {group("What was planted", STEP.whatPlanted, <>
        {summary.species.map((x) => <Fragment key={x.name}>{row(x.name, formatNumber(x.quantity))}</Fragment>)}
        {row("Total", `${formatNumber(summary.total)} plants`, true)}
      </>)}
      {!onChange && summary.notes && (
        <section className={s.sumGroup}>
          <div className={s.sumHead}><h3>Notes</h3></div>
          <p className={s.sumNotes}>{summary.notes}</p>
        </section>
      )}
    </div>
  );
}

/** What Submit shows while nothing can be saved: the event, plainly marked "Not saved". */
function Preview({ summary, location, onBack, onStartAnother }: {
  summary: EventSummary; location: string | null; onBack: () => void; onStartAnother: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  return (
    <div className={s.form}>
      <header className={s.head}>
        <span className={s.badge}>Not saved</span>
        <h2 ref={headingRef} tabIndex={-1} className={s.title}>Planting event preview</h2>
        <p className={s.context} role="status"><span>Everything checks out. This prototype can’t store events yet.</span></p>
      </header>
      <div className={s.scroll}><Summary summary={summary} location={location} /></div>
      <footer className={s.foot}>
        <button type="button" className={s.back} onClick={onBack}>Back to the form</button>
        <button type="button" className={s.next} onClick={onStartAnother}>Start another</button>
      </footer>
    </div>
  );
}

/** "44.97360° S, 168.85460° E" */
function spotLabel([lng, lat]: [number, number]) {
  return `${Math.abs(lat).toFixed(5)}° ${lat < 0 ? "S" : "N"}, ${Math.abs(lng).toFixed(5)}° ${lng < 0 ? "W" : "E"}`;
}
