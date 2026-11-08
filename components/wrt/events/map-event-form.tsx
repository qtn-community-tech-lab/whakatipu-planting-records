"use client";
/**
 * The planting-event form for the map view: the same three steps, state and
 * checks as EventForm (useEventForm), laid out for a panel over the map.
 *
 * 1. Where and when: the site the map picked, as a confirmed card, then the
 *    date, with the season it counts towards (changed only on request).
 * 2. What was planted: a search on top, then one row per species (name, Māori
 *    name, how many here before) with a quantity column down the side, like the
 *    paper sheets. The search filters the rows in place and brings in any other
 *    species. The host widens the panel for this step (onStepChange).
 * 3. Check and submit: a flat summary, then notes, then Submit.
 */
import { ArrowRight, Calendar, Camera, Check, ChevronDown, ChevronRight, Map as MapIcon, MapPin, Pencil, Pentagon, Plus, Search } from "lucide-react";
import Image from "next/image";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { TextareaInput } from "@/components/ui/inputs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { EventFormOptions, SpeciesOption } from "@/lib/wrt/events/form-options";
import { formatPlantedOn } from "@/lib/wrt/events/season";
import type { SpeciesSuggestion } from "@/lib/wrt/events/site-suggestions";
import { EVENT_STEPS, LAST_STEP, STEP } from "@/lib/wrt/events/steps";
import { describeEvent, WHOLE_SITE, type EventSummary } from "@/lib/wrt/events/summary";
import { EVENT_SEASONS, type EventSeason } from "@/lib/wrt/events/types";
import { NOTES_MAX } from "@/lib/wrt/events/validate";
import { formatNumber, rankMatches } from "@/lib/wrt/text";
import { cn } from "@/lib/utils";
import { useEventForm, type EventFormState } from "./use-event-form";
import s from "./map-event-form.module.css";

interface MapEventFormProps {
  options: EventFormOptions;
  /** NZ today, "YYYY-MM-DD" (from the server so it matches the validator). */
  today: string;
  /** Site to start on ("" for none yet). */
  initialPlace: string;
  /** A picture of where it is (the host's mini map): top of step 1 and of the check step. */
  plantedArea?: ReactNode;
  /** The chosen site's most planted species, for step 2. */
  suggestions: SpeciesSuggestion[];
  /** Tells the host which step is showing, so it can size the panel and move the map. */
  onStepChange?: (step: number) => void;
  /** Open the host's site chooser (no site yet, or a site problem to fix). */
  onChooseSite?: () => void;
  /** A site (and part) picked outside the form, from a pin on the map: the form switches to it. */
  picked?: { slug: string; parcelId: string | null } | null;
  /** Tells the host when the site or part changes, so the map can move its pin. */
  onPlaceChange?: (placeSlug: string, parcelId: string | null) => void;
  /** A new location dropped on the map, [longitude, latitude]. Shown in the form; not saved yet. */
  spot?: [number, number] | null;
  /** The pin nearest the new location; `matched` when it was close enough to fill in the site. */
  spotNear?: { label: string; km: number; matched: boolean } | null;
  /** Start dropping a new location on the map, and take it off again. */
  onAddSpot?: () => void;
  onRemoveSpot?: () => void;
  /** The new location's name, and whether it's a new part of the site or a pin for it. Not saved yet. */
  spotInfo?: SpotInfo;
  onSpotInfo?: (info: SpotInfo) => void;
  /** Plants and species recorded at each site ("slug") and part ("slug/part id"), for the parts list. */
  totals?: Record<string, { plants: number; species: number }>;
}

export interface SpotInfo { name: string; asPart: boolean }

export function MapEventForm(props: MapEventFormProps) {
  const [round, setRound] = useState(0);
  return <Form key={round} {...props} onStartAnother={() => setRound((r) => r + 1)} />;
}

function Form({ options, today, initialPlace, plantedArea, suggestions, picked, onChooseSite, onStepChange, onPlaceChange, spot, spotNear, onAddSpot, onRemoveSpot, spotInfo = { name: "", asPart: false }, onSpotInfo, totals = {}, onStartAnother }: MapEventFormProps & {
  onStartAnother: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const form = useEventForm({ options, today, formRef, headingRef, initialPlace });
  const { step } = form;
  // How the summary describes a new location: no coordinates, just what it is to the site.
  const location = !spot ? null : `${spotInfo.asPart ? "A new part" : "A pin for the site"}${spotInfo.name.trim() ? `: ${spotInfo.name.trim()}` : ""}`;

  useEffect(() => { onStepChange?.(form.preview ? LAST_STEP : step); }, [step, form.preview, onStepChange]);
  // Always, even with no site: the host shows the site in the header and title, so it must never keep an old one.
  useEffect(() => { onPlaceChange?.(form.placeSlug, form.parcelId); }, [form.placeSlug, form.parcelId, onPlaceChange]);
  // Take up each new pick once, so choosing another site in the form afterwards isn't undone.
  const applied = useRef(picked);
  useEffect(() => {
    if (!picked || picked === applied.current) return;
    applied.current = picked;
    form.chooseSite(picked.slug);
    if (picked.parcelId) form.setParcelId(picked.parcelId);
  });

  if (form.preview) {
    return <Preview summary={describeEvent(form.preview, options)} location={location} onBack={form.closePreview} onStartAnother={onStartAnother} />;
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
              <b>{formatNumber(form.total)}</b> plants · {form.lines.filter((l) => l.speciesId).length} species
            </span>
          )}
        </div>
      </header>

      <div className={s.scroll}>
        {/* Step 2 says what's wrong at its list instead. */}
        {hasErrors && step !== STEP.whatPlanted && (
          <div className="cn-callout cn-callout--risk cn-callout--sm" role="alert">
            {form.errors.form ?? "Some details need fixing. They are marked below."}
          </div>
        )}
        {step === STEP.whereWhen && <WhereWhen form={form} options={options} today={today} plantedArea={plantedArea} onChooseSite={onChooseSite} spot={spot ?? null} spotNear={spotNear ?? null} onAddSpot={onAddSpot} onRemoveSpot={onRemoveSpot} spotInfo={spotInfo} onSpotInfo={onSpotInfo} totals={totals} />}
        {step === STEP.whatPlanted && <WhatPlanted form={form} options={options} suggestions={suggestions} />}
        {step === STEP.check && (
          <>
            {plantedArea ?? (
              // Where the planted area's map snippet goes once areas can be drawn.
              <div className={s.areaPlaceholder}>
                <MapIcon size={22} strokeWidth={2} />
                <b>Planted area</b>
                <span>A map of the area goes here once it can be drawn.</span>
              </div>
            )}
            {form.checkedEvent
              ? <Summary summary={describeEvent(form.checkedEvent, options)} location={location} onChange={form.goTo} />
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
          {step < LAST_STEP && <ArrowRight size={18} strokeWidth={2.2} />}
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

function WhereWhen({ form, today, plantedArea, onChooseSite, spot, spotNear, onAddSpot, onRemoveSpot, spotInfo, onSpotInfo, totals }: {
  form: EventFormState; options: EventFormOptions; today: string; plantedArea: ReactNode; onChooseSite?: () => void;
  spot: [number, number] | null; spotNear: { label: string; km: number; matched: boolean } | null;
  onAddSpot?: () => void; onRemoveSpot?: () => void;
  spotInfo: SpotInfo; onSpotInfo?: (info: SpotInfo) => void;
  totals: Record<string, { plants: number; species: number }>;
}) {
  const { err } = form;
  // The site is shown and changed in the panel's title (the host's chooser). Here: a prompt
  // when there's none yet, a problem with it, or a new location away from every site.
  const unmatched = !!spot && !!spotNear && !spotNear.matched;
  const siteProblem = err("placeSlug") ?? err("parcelId");
  const dateRef = useRef<HTMLInputElement>(null);
  const seasonProblem = err("season") ?? err("seasonYear");
  const [seasonOpen, setSeasonOpen] = useState(form.seasonChosen);


  return (
    <>
      {/* Where: the site, and the other two ways to set it (also in the title and the + menu over the map).
          With a new location, its own card below says where instead. */}
      {!spot && <section className={s.group} aria-label="Where">
        <div className={s.card}>
          <span className={s.cardIcon}><MapPin size={20} strokeWidth={2} /></span>
          <span className={s.cardText}>
            <b>{form.site?.name ?? "Choose a site"}</b>
            {form.site?.parts.length ? (
              <PartPicker site={form.site} value={form.parcelId} totals={totals} onChoose={form.setParcelId} />
            ) : (
              <span>{form.site ? "The site as a whole" : "Or click a pin on the map"}</span>
            )}
          </span>
          <button type="button" className={s.link} onClick={onChooseSite}>{form.site ? "Change" : "Choose"}</button>
        </div>
        <div className={s.whereActions}>
          <button type="button" onClick={onAddSpot}><Plus size={18} strokeWidth={2.2} />New location</button>
          {/* Drawing the planted area comes in the next PR. */}
          <button type="button" disabled><Pentagon size={18} strokeWidth={2.2} />Draw area<span className={s.soon}>Next</span></button>
        </div>
      </section>}
      {(siteProblem || unmatched || spot || plantedArea) && <section className={s.group} aria-label="Where">
        {/* The site is chosen from the panel's title; only a problem with it is raised here. */}
        {(siteProblem || unmatched) && (
          // One line that says what's wrong and opens the chooser.
          <div role={siteProblem ? "alert" : undefined}>
            <button type="button" className={s.choosePrompt} onClick={onChooseSite}>
              {siteProblem ?? "This new location isn't at a known site. Choose one."}
              <ChevronRight size={18} strokeWidth={2.4} />
            </button>
          </div>
        )}
        {spot && (
          // The new location replaces the site card: its name (type to change it), how near the site's pin it is,
          // what it is to the site, and Move / Remove.
          <div className={cn(s.card, s.spotCard)}>
            <div className={s.spotHead}>
              <span className={s.cardIcon} aria-hidden="true"><MapPin size={20} strokeWidth={2} /></span>
              <span className={s.cardText}>
                <label className={s.spotName}>
                  <span className="sr-only">Name of the new location</span>
                  <input value={spotInfo.name} placeholder="Name this place" onChange={(e) => onSpotInfo?.({ ...spotInfo, name: e.target.value })} autoComplete="off" />
                  <Pencil size={16} strokeWidth={2.2} />
                </label>
                {spotNear && (
                  <span className={cn(!spotNear.matched && s.spotFar)}>
                    {spotNear.matched
                      ? `${spotNear.km < 0.05 ? "Right at" : `${kmLabel(spotNear.km)} from`} ${spotNear.label}`
                      : `Not at a known site. Nearest: ${spotNear.label}, ${kmLabel(spotNear.km)}.`}
                  </span>
                )}
              </span>
            </div>
            {form.site && (
              <div role="radiogroup" aria-label={`What this location is to ${form.site.name}`} className={cn(s.segment, s.segmentTwo)}>
                <button type="button" role="radio" aria-checked={!spotInfo.asPart} className={s.segmentItem} onClick={() => onSpotInfo?.({ ...spotInfo, asPart: false })}>
                  A pin for the site
                </button>
                <button type="button" role="radio" aria-checked={spotInfo.asPart} className={s.segmentItem} onClick={() => onSpotInfo?.({ ...spotInfo, asPart: true })}>
                  A new part
                </button>
              </div>
            )}
            <div className={s.spotActions}>
              {onAddSpot && <button type="button" className={s.link} onClick={onAddSpot}>Move</button>}
              {onRemoveSpot && <button type="button" className={s.link} onClick={onRemoveSpot}>Remove</button>}
            </div>
          </div>
        )}
        {plantedArea}
      </section>}

      <section className={s.group} aria-label="When">
        {/* One small row, so it doesn't compete with where: the date, and the season it counts towards. */}
        <div className={s.dateRow}>
          <Calendar size={18} strokeWidth={2} />
          <span className={s.dateText}>
            <b>{form.plantedOn ? `${form.plantedOn === today ? "Today, " : ""}${formatPlantedOn(form.plantedOn)}` : "Choose a date"}</b>
            <span>{form.season} {form.seasonYear}</span>
          </span>
          <input
            ref={dateRef} type="date" className={s.dateInput} value={form.plantedOn} max={today} aria-label="Planting date"
            aria-invalid={!!err("plantedOn")} onChange={(e) => form.changeDate(e.target.value)}
          />
          <button type="button" className={s.link} onClick={() => dateRef.current?.showPicker?.()}>Change</button>
        </div>
        {err("plantedOn") && <p className={s.problem} role="alert">{err("plantedOn")}</p>}
        {/* Rarely needed: WRT counting a planting in another season than its date's. */}
        {seasonOpen || seasonProblem ? (
          <div className={s.seasonRow}>
            <div role="radiogroup" aria-label="Counts towards season" className={s.segment}>
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
        ) : (
          <button type="button" className={cn(s.inlineLink, s.seasonLink)} onClick={() => setSeasonOpen(true)}>Counts towards a different season?</button>
        )}
        {seasonProblem && <p className={s.problem} role="alert">{seasonProblem}</p>}
      </section>
    </>
  );
}

/**
 * The part of this site, as a small popover: the site as a whole and each part, with what's been planted there.
 * Quicker than the full site chooser when only the part changes.
 */
function PartPicker({ site, value, totals, onChoose }: {
  site: { slug: string; parts: readonly { id: string; name: string }[] }; value: string | null;
  totals: Record<string, { plants: number; species: number }>; onChoose: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = [{ id: null, name: "The site as a whole" }, ...site.parts];
  const amount = (x?: { plants: number; species: number }) => x?.plants ? `${formatNumber(x.plants)} plants · ${x.species} species` : "No plants recorded yet";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={s.partTrigger}>
        {options.find((o) => o.id === value)?.name ?? "The site as a whole"}
        <ChevronDown size={16} strokeWidth={2.4} />
      </PopoverTrigger>
      <PopoverContent className={s.partList} aria-label="Parts of this site">
        {options.map((o) => (
          <button key={o.id ?? "whole"} type="button" aria-pressed={o.id === value} onClick={() => { onChoose(o.id); setOpen(false); }}>
            <span className={s.cardText}>
              <b>{o.name}</b>
              <span>{amount(totals[o.id ? `${site.slug}/${o.id}` : site.slug])}</span>
            </span>
            {o.id === value && <Check size={18} strokeWidth={2.4} />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function WhatPlanted({ form, options, suggestions }: {
  form: EventFormState; options: EventFormOptions; suggestions: SpeciesSuggestion[];
}) {
  // The camera is a placeholder for now: tapping it only says photos come later.
  const [cameraTip, setCameraTip] = useState(false);
  useEffect(() => {
    if (!cameraTip) return;
    const t = setTimeout(() => setCameraTip(false), 2500);
    return () => clearTimeout(t);
  }, [cameraTip]);
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
          <Search size={18} strokeWidth={2.2} />
          <span className="sr-only">Search species</span>
          <input type="search" value={query} placeholder="Search species" onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
          {query
            ? <button type="button" className={s.searchClear} aria-label="Clear search" onClick={() => setQuery("")}>×</button>
            : (
              <button
                type="button" className={s.searchCamera} aria-disabled="true" title="Photos are coming next"
                aria-label="Take a photo of what was planted (coming next)" onClick={() => setCameraTip(true)}
              >
                <Camera size={20} strokeWidth={2} />
              </button>
            )}
        </label>
        {cameraTip && <p className={s.tip} role="status">Photos of what was planted are coming next.</p>}
        {nothingYet && <p className={s.problem} role="alert">Enter how many went in for at least one species.</p>}
        {err("species") && <p className={s.problem} role="alert">{err("species")}</p>}
      </div>


      {shown.length > 0 && (
        <>
          <div className={s.rowsHead} aria-hidden="true">
            <span className={s.groupTitle}>{query.trim() ? "On this list" : "Planted here before"}</span>
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
function Summary({ summary, location, onChange }: {
  summary: EventSummary; location: string | null; onChange?: (step: number) => void;
}) {
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

function kmLabel(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
