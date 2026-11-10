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
import { ArrowRight, ArrowUpRight, Calendar, Camera, Check, ChevronDown, ChevronRight, Map as MapIcon, MapPin, MapPinPlus, Pencil, Pentagon, Plus, SquareDashedMousePointer, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { TextareaInput } from "@/components/ui/inputs";
import { partHref } from "@/components/wrt/sites/site-rows";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { EventFormOptions, SpeciesOption } from "@/lib/wrt/events/form-options";
import { formatPlantedOn } from "@/lib/wrt/events/season";
import type { SpeciesSuggestion } from "@/lib/wrt/events/site-suggestions";
import { EVENT_STEPS, LAST_STEP, STEP } from "@/lib/wrt/events/steps";
import { describeEvent, WHOLE_SITE, type EventSummary } from "@/lib/wrt/events/summary";
import { EVENT_SEASONS, type EventSeason } from "@/lib/wrt/events/types";
import { NOTES_MAX } from "@/lib/wrt/events/validate";
import { DatePicker } from "@/components/ui/date-picker";
import { formatNumber, rankMatches } from "@/lib/wrt/text";
import { formatHectares, hectares } from "@/lib/wrt/areas/planted-area";
import { cn } from "@/lib/utils";
import { SearchField } from "@/components/wrt/shared/search-field";
import { useEventForm, type EventFormState } from "./use-event-form";
import s from "./map-event-form.module.css";

interface MapEventFormProps {
  options: EventFormOptions;
  /** NZ today, "YYYY-MM-DD" (from the server so it matches the validator). */
  today: string;
  /** Site to start on ("" for none yet). */
  initialPlace: string;
  /** A picture of where it is (the host's mini map): in step 1, the check step and the preview. */
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
  /** The new location's name, and whether it's a new location near the site or a sublocation of it. Not saved yet. */
  spotInfo?: SpotInfo;
  onSpotInfo?: (info: SpotInfo) => void;
  /** Plants and species recorded at each site ("slug") and part ("slug/part id"), for the parts list. */
  totals?: PlantTotals;
  /** The chosen site's pin was in the wrong place and has been moved (not saved yet); move it, or put it back. */
  pinMoved?: boolean;
  onMovePin?: () => void;
  onUndoPin?: () => void;
  /** The planted areas drawn on the map (not saved yet), in order, and drawing another. Plants are listed per area. */
  areas?: readonly DrawnArea[];
  onDrawArea?: () => void;
  /** Tells the host how many plants are listed in each area (by area id), for the map's area buttons. */
  onAreaPlants?: (plants: Record<number, number>) => void;
  /** Tells the host which area's plants are being entered (its id), or null: the map shows that one. */
  onAreaFocus?: (id: number | null) => void;
  /** Start another was pressed: the form starts over, and the host clears what it holds for the event (its areas). */
  onReset?: () => void;
  /** Kept mounted but out of sight, e.g. while the host shows the place first. */
  hidden?: boolean;
}

export interface SpotInfo { name: string; asPart: boolean }
/** A drawn planted area: `id` stays with it; its number on screen is its place in the list. */
export interface DrawnArea { id: number; pts: readonly (readonly [number, number])[] }
const areaHa = (a: DrawnArea) => formatHectares(hectares(a.pts));
const NO_SPOT: SpotInfo = { name: "", asPart: false };
const NO_AREAS: readonly DrawnArea[] = [];

/** Plants and species recorded at each site ("slug") and part ("slug/part id"). */
export type PlantTotals = Record<string, { plants: number; species: number }>;

/** "1,280 plants · 30 species", or "No plants recorded yet". */
export function plantsLine(x?: { plants: number; species: number }) {
  return x?.plants ? `${formatNumber(x.plants)} plants · ${x.species} species` : "No plants recorded yet";
}

export function MapEventForm(props: MapEventFormProps) {
  const [round, setRound] = useState(0);
  return <Form key={round} {...props} onStartAnother={() => { setRound((r) => r + 1); props.onReset?.(); }} />;
}

function Form(props: MapEventFormProps & { onStartAnother: () => void }) {
  const { options, today, initialPlace, plantedArea, suggestions, picked, onStepChange, onPlaceChange, spot, spotInfo = NO_SPOT, pinMoved, hidden, onStartAnother } = props;
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const form = useEventForm({ options, today, formRef, headingRef, initialPlace });
  const { step } = form;
  // How the summary describes a new location: no coordinates, just what it is to the site.
  const location = spot
    ? `${spotInfo.asPart ? "New sublocation" : "New location"}${spotInfo.name.trim() ? `: ${spotInfo.name.trim()}` : ""}`
    : pinMoved ? "Site's pin moved (not saved yet)" : null;

  const place = spot ? spotInfo.name.trim() || "a new location" : form.site?.name;
  // The planted areas in a line: "1 area · 6.06 ha", "2 areas · 4.03 ha".
  const areas = props.areas ?? NO_AREAS;
  const areaLine = areas.length
    ? `${areas.length === 1 ? "1 area" : `${areas.length} areas`} · ${formatHectares(areas.reduce((t, a) => t + hectares(a.pts), 0))}`
    : null;
  // Plants are listed per area: keep every line in an area that still exists (nothing typed is lost).
  const areaIds = areas.map((a) => a.id).join();
  const { keepAreas } = form;
  useEffect(() => { keepAreas(areaIds ? areaIds.split(",").map(Number) : []); }, [areaIds, keepAreas]);
  // How many plants are in each area, for the buttons on the map.
  const { onAreaPlants } = props;
  const plantsKey = form.lines.map((l) => `${l.area}:${l.quantity}`).join();
  useEffect(() => {
    const out: Record<number, number> = {};
    for (const l of form.lines) if (l.area !== undefined && l.speciesId) out[l.area] = (out[l.area] ?? 0) + (Number(l.quantity) || 0);
    onAreaPlants?.(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- plantsKey is what the lines say
  }, [plantsKey, onAreaPlants]);

  useEffect(() => { onStepChange?.(form.preview ? LAST_STEP : step); }, [step, form.preview, onStepChange]);
  // Always, even with no site: the host shows the site in the header and title, so it must never keep an old one.
  useEffect(() => { onPlaceChange?.(form.placeSlug, form.parcelId); }, [form.placeSlug, form.parcelId, onPlaceChange]);
  // Take up each new pick once, so choosing another site in the form afterwards isn't undone.
  // Starts empty, so a fresh form (Start another, or a new key from the host) takes up the latest pick.
  const applied = useRef<typeof picked>(null);
  useEffect(() => {
    if (!picked || picked === applied.current) return;
    applied.current = picked;
    form.chooseSite(picked.slug);
    if (picked.parcelId) form.setParcelId(picked.parcelId);
  });

  if (form.preview) {
    return <Preview summary={describeEvent(form.preview, options)} location={location} areaLine={areaLine} areas={areas} plantedArea={plantedArea} onBack={form.closePreview} onStartAnother={onStartAnother} />;
  }

  const next = step < LAST_STEP ? `Next: ${EVENT_STEPS[step + 1].title}` : "Submit planting event";
  const hasErrors = Object.keys(form.errors).length > 0;

  return (
    <form ref={formRef} className={s.form} onSubmit={form.submit} noValidate aria-label="New planting event" hidden={hidden}>
      <header className={s.head}>
        <Steps form={form} />
        <div className={s.titleRow}>
          {/* Step 1 says what this is: a new event at the place picked on the map, not just a form. */}
          <h2 ref={headingRef} tabIndex={-1} className={s.title}>{step === STEP.whereWhen ? "New planting event" : EVENT_STEPS[step].title}</h2>
          {step === STEP.whatPlanted && (
            <span className={s.total} aria-live="polite">
              <b>{formatNumber(form.total)}</b> plants · {form.lines.filter((l) => l.speciesId).length} species
            </span>
          )}
        </div>
        {step === STEP.whereWhen && (
          <p className={s.context}>
            {place ? `At ${place}.` : "Choose when and where it was planted."}
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
        {step === STEP.whereWhen && <WhereWhen {...props} form={form} />}
        {step === STEP.whatPlanted && <WhatPlanted form={form} options={options} suggestions={suggestions} areas={areas} onDrawArea={props.onDrawArea} onAreaFocus={props.onAreaFocus} />}
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
              ? <Summary summary={describeEvent(form.checkedEvent, options)} location={location} areaLine={areaLine} areas={areas} onChange={form.goTo} />
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
              <span>{st.title}</span>
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

/** Step 1: the date, then where: the site (or the new location's card), how to mark where exactly, and the mini map. */
function WhereWhen({ form, today, plantedArea, onChooseSite, spot, spotNear, onAddSpot, onRemoveSpot, spotInfo = NO_SPOT, onSpotInfo, totals = {}, pinMoved, onMovePin, onUndoPin, areas = NO_AREAS, onDrawArea }: MapEventFormProps & { form: EventFormState }) {
  const { err } = form;
  // A new location away from every site needs one chosen.
  const unmatched = !!spot && !!spotNear && !spotNear.matched;
  const siteProblem = err("placeSlug") ?? err("parcelId");
  const partName = form.site?.parts.find((p) => p.id === form.parcelId)?.name;
  const seasonProblem = err("season") ?? err("seasonYear");
  const [seasonOpen, setSeasonOpen] = useState(form.seasonChosen);

  return (
    <>
      <section className={s.group} aria-label="When">
        {/* First, one small row: the date, and the season it counts towards. */}
        <div className={s.dateRow}>
          <Calendar size={18} strokeWidth={2} />
          <span className={s.dateText}>
            <b>{form.plantedOn ? `${form.plantedOn === today ? "Today, " : ""}${formatPlantedOn(form.plantedOn)}` : "Choose a date"}</b>
            <span>{form.season} {form.seasonYear}</span>
          </span>
          <DatePicker
            value={form.plantedOn} max={today} onChange={form.changeDate} className={s.link}
            aria-label="Change planting date" aria-invalid={!!err("plantedOn")}
          >
            Change
          </DatePicker>
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

      {/* Where: the site as plain text (the title and the + menu over the map change it too), or the new
          location's card, then the mini map. The parts dropdown also offers a new location and drawing. */}
      <section className={s.group} aria-label="Where">
        {!spot && (
          <div className={s.place}>
            <div className={s.placeHead}>
              <b>{form.site?.name ?? "Choose a site"}</b>
              <button type="button" className={s.link} onClick={onChooseSite}>{form.site ? "Change" : "Choose"}</button>
            </div>
            {form.site ? (
              <PartPicker site={form.site} value={form.parcelId} totals={totals} onChoose={form.setParcelId} onAddSpot={onAddSpot} onDrawArea={onDrawArea} />
            ) : (
              <span>Or click a pin on the map</span>
            )}
            {form.site && (
              <span className={s.placeLinks}>
                {/* The site's (or part's) page, in a new tab so the form keeps what's entered.
                    Parts only have pages when a site has more than one. */}
                <Link
                  href={partName && form.site.parts.length > 1 ? partHref(form.site.slug, partName) : `/sites/${form.site.slug}`}
                  target="_blank" className={s.siteLink}
                >
                  {partName && form.site.parts.length > 1 ? "Part details" : "Site details"}<ArrowUpRight size={14} strokeWidth={2.4} />
                </Link>
                {/* Some pins are in the wrong place: move this one on the map. Not saved yet. */}
                {onMovePin && (
                  pinMoved
                    ? <span className={s.pinMoved}>Pin moved, not saved yet. <button type="button" onClick={onMovePin}>Move again</button> <button type="button" onClick={onUndoPin}>Undo</button></span>
                    : <button type="button" className={s.siteLink} onClick={onMovePin}>Wrong pin? Move it</button>
                )}
              </span>
            )}
          </div>
        )}
        {/* Where exactly at the site: a pin, or the planted area drawn on the map; picking one already drawn comes next. */}
        {!spot && form.site && (
          <div className={s.whereTools} role="group" aria-label="Mark where exactly">
            <button type="button" onClick={onAddSpot}><MapPinPlus size={20} strokeWidth={2} />New location</button>
            <button type="button" onClick={onDrawArea} disabled={!onDrawArea}><Pentagon size={20} strokeWidth={2} />{areas.length ? `${areas.length === 1 ? "Area" : `${areas.length} areas`} ${formatHectares(areas.reduce((t, a) => t + hectares(a.pts), 0))}` : "Draw area"}</button>
            <button type="button" disabled><SquareDashedMousePointer size={20} strokeWidth={2} />Choose area<span className={s.soon}>Next</span></button>
          </div>
        )}
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
          // what it is to the site, and Cancel / Move pin.
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
                  New location
                </button>
                <button type="button" role="radio" aria-checked={spotInfo.asPart} className={s.segmentItem} onClick={() => onSpotInfo?.({ ...spotInfo, asPart: true })}>
                  New sublocation
                </button>
              </div>
            )}
            {/* Back out plainly: the form goes back to the site as it was. */}
            <div className={s.spotActions}>
              {onRemoveSpot && <button type="button" className={s.spotCancel} onClick={onRemoveSpot}><X size={16} strokeWidth={2.6} />Cancel new location</button>}
              {onAddSpot && <button type="button" className={s.link} onClick={onAddSpot}>Move pin</button>}
            </div>
          </div>
        )}
        {plantedArea}
      </section>

    </>
  );
}

/**
 * The part of this site, as a small popover: the site as a whole and each part, with what's been planted there.
 * Quicker than the full site chooser when only the part changes.
 */
function PartPicker({ site, value, totals, onChoose, onAddSpot, onDrawArea }: {
  site: { slug: string; parts: readonly { id: string; name: string }[] }; value: string | null;
  totals: PlantTotals; onChoose: (id: string | null) => void;
  onAddSpot?: () => void;
  onDrawArea?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const options = [{ id: null, name: "The site as a whole" }, ...site.parts];
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
              <span>{plantsLine(totals[o.id ? `${site.slug}/${o.id}` : site.slug])}</span>
            </span>
            {o.id === value && <Check size={18} strokeWidth={2.4} />}
          </button>
        ))}
        {/* Somewhere not on the list: a new spot, or its planting area drawn on the map. */}
        <div className={s.partMore}>
          {onAddSpot && <button type="button" onClick={() => { setOpen(false); onAddSpot(); }}><Plus size={18} strokeWidth={2.2} />New location</button>}
          {onDrawArea && <button type="button" onClick={() => { setOpen(false); onDrawArea(); }}><Pentagon size={18} strokeWidth={2.2} />Draw out planting spots</button>}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function WhatPlanted({ form, options, suggestions, areas, onDrawArea, onAreaFocus }: {
  form: EventFormState; options: EventFormOptions; suggestions: SpeciesSuggestion[];
  /** With drawn areas, plants are listed per area: one tab each. */
  areas: readonly DrawnArea[]; onDrawArea?: () => void; onAreaFocus?: (id: number | null) => void;
}) {
  // The area being filled in (its id), or undefined when the event has no areas.
  const [picked, setPicked] = useState<number | undefined>(undefined);
  const area = areas.some((a) => a.id === picked) ? picked : areas[0]?.id;
  // The map shows the area being filled in, so plants never go in the wrong one; leaving this step lets it go.
  useEffect(() => {
    onAreaFocus?.(area ?? null);
    return () => onAreaFocus?.(null);
  }, [area, onAreaFocus]);
  const plantsIn = (id: number) => form.lines.reduce((t, l) => t + (l.area === id && l.speciesId ? Number(l.quantity) || 0 : 0), 0);
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
  const lineOf = (id: string) => form.lines.findIndex((l) => l.speciesId === id && l.area === area);

  // The site's species, then anything added from the search. Typing filters them in
  // place and brings in matches from the whole species list underneath.
  const listed = [
    ...suggestions.map((x) => byId.get(x.speciesId)).filter((x): x is SpeciesOption => !!x),
    ...form.lines.filter((l) => l.area === area).map((l) => byId.get(l.speciesId)).filter((x): x is SpeciesOption => !!x && !site.has(x.id)),
  ];
  const shown = query.trim() ? rankMatches(listed, query) : listed;
  const listedIds = new Set(listed.map((x) => x.id));
  const more = query.trim() ? rankMatches(options.species, query).filter((x) => !listedIds.has(x.id)).slice(0, 15) : [];

  /** Typing a number adds the species; clearing it takes the species off again. */
  const setPlanted = (speciesId: string, value: string) => {
    const i = lineOf(speciesId);
    if (i < 0) {
      if (value.trim()) form.addSpecies(speciesId, value, area);
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
      {areas.length > 0 && (
        // One tab per drawn area: what was planted in each. The event's total adds them up.
        <div className={s.areaTabs} role="tablist" aria-label="Planted areas">
          {areas.map((a, i) => {
            const n = plantsIn(a.id);
            return (
              <button
                key={a.id} type="button" role="tab" aria-selected={a.id === area} onClick={() => setPicked(a.id)}
                aria-label={`Area ${i + 1}, ${areaHa(a)}, ${n ? `${formatNumber(n)} plants` : "no plants yet"}`}
              >
                <span className={s.areaNo}>{i + 1}</span>
                <span><b>{areaHa(a)}</b><small>{n ? `${formatNumber(n)} plants` : "No plants yet"}</small></span>
              </button>
            );
          })}
          {onDrawArea && <button type="button" className={s.areaAdd} onClick={onDrawArea}><Plus size={16} strokeWidth={2.6} aria-hidden="true" />Add area</button>}
        </div>
      )}
      <div className={s.searchBar}>
        <SearchField label="Search species" placeholder="Search species" value={query} onChange={setQuery}>
          <button
            type="button" className={s.searchCamera} aria-disabled="true" title="Photos are coming next"
            aria-label="Take a photo of what was planted (coming next)" onClick={() => setCameraTip(true)}
          >
            <Camera size={20} strokeWidth={2} />
          </button>
        </SearchField>
        {cameraTip && <p className={s.tip} role="status">Photos of what was planted are coming next.</p>}
        {nothingYet && <p className={s.problem} role="alert">Enter how many went in for at least one species.</p>}
        {err("species") && <p className={s.problem} role="alert">{err("species")}</p>}
      </div>

      {shown.length > 0 && (
        <>
          <div className={s.rowsHead} aria-hidden="true">
            <span className={s.groupTitle}>
              {query.trim() ? "On this list" : "Planted here before"}
              {area !== undefined && ` · area ${areas.findIndex((a) => a.id === area) + 1}`}
            </span>
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
function Summary({ summary, location, areaLine, areas = NO_AREAS, onChange }: {
  summary: EventSummary; location: string | null; areaLine?: string | null; areas?: readonly DrawnArea[]; onChange?: (step: number) => void;
}) {
  // With areas, what was planted reads area by area: "Area 1 · 11.2 ha", its species, then the next.
  const byArea = areas.length
    ? areas.map((a, i) => ({ title: `Area ${i + 1} · ${areaHa(a)}`, species: summary.species.filter((x) => x.area === a.id) })).filter((g) => g.species.length)
    : [{ title: null, species: summary.species }];
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
        {location && row("Location", location)}
        {areaLine && row("Planted area", areaLine)}
        {row("Date", summary.date)}
        {row("Season", summary.season)}
      </>)}
      {group("What was planted", STEP.whatPlanted, <>
        {byArea.map((g) => (
          <Fragment key={g.title ?? "all"}>
            {g.title && <div className={s.sumArea}>{g.title}</div>}
            {g.species.map((x) => <Fragment key={x.name}>{row(x.name, formatNumber(x.quantity))}</Fragment>)}
          </Fragment>
        ))}
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
function Preview({ summary, location, areaLine, areas, plantedArea, onBack, onStartAnother }: {
  summary: EventSummary; location: string | null; areaLine: string | null; areas: readonly DrawnArea[]; plantedArea?: ReactNode; onBack: () => void; onStartAnother: () => void;
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
      <div className={s.scroll}>{plantedArea}<Summary summary={summary} location={location} areaLine={areaLine} areas={areas} /></div>
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
