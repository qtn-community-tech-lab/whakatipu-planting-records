"use client";
/**
 * The planting-event form for the map view: the same state and checks as EventForm
 * (useEventForm), on one scrolling page laid out for a panel over the map.
 *
 * Where and when first: the site on a mini map, then under it the site and part (tap to open the
 * site chooser) and the date with its season, and any areas drawn on the map. A new location
 * dropped from the map's + is named here too.
 * Then what was planted: a search, then one row per species (name, Māori name, how many here
 * before) with a quantity column down the side, like the paper sheets. Every other species is
 * listed underneath; the search filters both lists in place. An optional note, then Submit.
 */
import { Calendar, Camera, Check, ChevronRight, Map as MapIcon, MapPin, Pencil, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { Badge } from "@/components/ui/badge";
import { TextareaInput } from "@/components/ui/inputs";
import { Spinner } from "@/components/ui/spinner";
import { AreaShape } from "@/components/wrt/shared/area-shape";
import { FigureList, type FigureRow } from "@/components/wrt/shared/figure-list";
import { ListRow } from "@/components/wrt/shared/list-row";
import { AreaPicker } from "@/components/wrt/shared/area-picker";
import { SearchField } from "@/components/wrt/shared/search-field";
import { Segmented } from "@/components/wrt/shared/segmented";
import { NAME_FIELD, NUMBER_FIELD, digits, enterStaysInField } from "@/components/wrt/shared/fields";
import type { EventFormOptions, SpeciesOption } from "@/lib/wrt/events/form-options";
import { formatPlantedOn } from "@/lib/wrt/events/season";
import type { SpeciesSuggestion } from "@/lib/wrt/events/site-suggestions";
import { MAP_EVENT_STEPS } from "@/lib/wrt/events/steps";
import { describeEvent, WHOLE_SITE, type EventSummary } from "@/lib/wrt/events/summary";
import type { PlantingEventInput } from "@/lib/wrt/events/types";
import { NOTES_MAX } from "@/lib/wrt/events/validate";
import { DatePicker } from "@/components/ui/date-picker";
import { formatNumber, fromPin, kmLabel, partBesideSite, plantsOrNone, rankMatches, spotKind } from "@/lib/wrt/text";
import { formatHectares, hectares } from "@/lib/wrt/areas/planted-area";
import { cn } from "@/lib/utils";
import { NEW_SITE, useEventForm, type EventFormState } from "./use-event-form";
import type { PlantingEventSubmitResult } from "@/db/types";
import { useHideOnScroll } from "./use-hide-on-scroll";
import s from "./map-event-form.module.css";

/** "Today, 12 Nov", or "3 Oct 2026": short enough for half a phone's width. */
const shortDate = (date: string, today: string) =>
  date === today ? `Today, ${formatPlantedOn(today).replace(/^\S+ | \d{4}$/g, "")}` : formatPlantedOn(date).replace(/^\S+ /, "");

export interface MapEventFormProps {
  options: EventFormOptions;
  /** NZ today, "YYYY-MM-DD" (from the server so it matches the validator). */
  today: string;
  /** Site to start on ("" for none yet). */
  initialSite: string;
  /** The part of that site to start on (its id), e.g. from a bookmark. */
  initialPart?: string | null | undefined;
  /** A picture of where it is (the host's mini map): at the top, and on the receipt. */
  plantedArea?: ReactNode | undefined;
  /** Back: out of the form, to what came before it (the site's overview). Entries are kept. */
  onBack?: (() => void) | undefined;
  /** The chosen site's most planted species, for the plant list. */
  suggestions: SpeciesSuggestion[];
  /** Something in the plant list has focus (its search, a quantity): phones take the sheet full screen for it. */
  onListFocus?: (() => void) | undefined;
  /** Open the host's site chooser (no site yet, or a site problem to fix). */
  onChooseSite?: (() => void) | undefined;
  /** The place tile's menu (the site's parts, New sublocation, Another site), wrapping the tile button. Without it the tile opens the site chooser. */
  placeMenu?: ((button: { className: string; label: string; children: ReactNode }) => ReactNode) | undefined;
  /** A site (and part) picked outside the form, from a pin on the map: the form switches to it. */
  picked?: { slug: string; parcelId: string | null } | null;
  /** Tells the host when the site or part changes, so the map can move its pin. */
  onSiteChange?: ((siteSlug: string, parcelId: string | null) => void) | undefined;
  /** A new location dropped on the map, [longitude, latitude]. Shown in the form; not saved yet. */
  spot?: [number, number] | null | undefined;
  /** The pin nearest the new location; `matched` when it was close enough to fill in the site. */
  spotNear?: { label: string; km: number; matched: boolean } | null;
  /** How far the new location is from its site's pin, and how far counts as at a site: further warns (no block). */
  spotKm?: number | null | undefined;
  /** The drawn areas' furthest distance from the event's site: further than `nearKm` gets the same quiet note. */
  areaKm?: number | null | undefined;
  nearKm?: number | undefined;
  /** Keep the new location for this visit (Add the location on its own: Save location). */
  onKeepLocation?: (() => void) | undefined;
  /** A planting event was saved at the new location: the host keeps it for this visit. */
  onSavedAtSpot?: (() => void) | undefined;
  /** Start dropping a new location on the map, and take it off again. */
  onAddSpot?: (() => void) | undefined;
  onRemoveSpot?: (() => void) | undefined;
  /** The new location's name, and whether it's a new location near the site or a sublocation of it. Not saved yet. */
  spotInfo?: SpotInfo | undefined;
  onSpotInfo?: ((info: SpotInfo) => void) | undefined;
  /** The chosen site's pin was in the wrong spot and has been moved (not saved yet; moved from the site's overview): the summary says so. */
  pinMoved?: boolean | undefined;
  /** The planted areas drawn on the map (not saved yet), in order, and drawing another. Plants are listed per area. */
  areas?: readonly DrawnArea[] | undefined;
  onDrawArea?: (() => void) | undefined;
  /** Show a drawn area on the map (its id): the host goes there, and on phones lowers the sheet so the map shows. */
  onShowArea?: ((id: number) => void) | undefined;
  /** The host lists the areas itself (the wide panel's navigator): the form leaves its own list out. */
  areasListed?: boolean | undefined;
  /** Tells the host how many plants are listed in each area (by area id), for the map's area buttons. */
  onAreaPlants?: ((plants: Record<number, number>) => void) | undefined;
  /** An area picked outside the form (the map's bar) to list its plants: the form scrolls to its list, on that area. A new object each time. */
  plantIn?: { id: AreaPick } | null;
  /** Tells the host which area's plants are being entered (its id), or null: the map shows that one. */
  onAreaFocus?: ((id: number | null) => void) | undefined;
  /** After a save, the receipt's way out beside Start another: e.g. back to the site's page. */
  onFinish?: { label: string; onClick: () => void } | undefined;
  /** Start another was pressed: the form starts over, and the host clears what it holds for the event (its areas). */
  onReset?: (() => void) | undefined;
  /** The plant list opened from an area's Add plants was closed with Done: the host shows the map again (phones). */
  onPlantClose?: (() => void) | undefined;
  /** Tells the host what the form holds: anything entered (a species, a note), saved, saved without its plants
   * (`partly`: where and when can't change now), or saving now. Unsaved entries make leaving ask. */
  onEntries?: ((state: FormEntries) => void) | undefined;
  /** Kept mounted but out of sight, e.g. while the host shows the site first. */
  hidden?: boolean | undefined;
  /** Saves the checked event and its plants (a server action). Without it, Submit shows a "Not saved" receipt. */
  onSave?: ((input: PlantingEventInput, savedPlantingEvent?: number) => Promise<PlantingEventSubmitResult>) | undefined;
}

/** `decided`: started as a sublocation or a new site, so the kind isn't asked again. */
export interface SpotInfo { name: string; asPart: boolean; decided?: boolean | undefined }
export interface FormEntries { entered: boolean; saved: boolean; partly: boolean; saving: boolean }
/** A drawn planted area: `id` stays with it; its number on screen is its place in the list; `name` if it was given one. */
interface DrawnArea { id: number; pts: readonly (readonly [number, number])[]; name?: string | undefined }
const areaHa = (a: DrawnArea) => formatHectares(hectares(a.pts));
/** What an area is called: its name, or "Area 2". */
const areaName = (a: DrawnArea, i: number) => a.name || `Area ${i + 1}`;
/** With drawn areas, plants can also go to the site as a whole: in no area (a line with no `area`). */
export const WHOLE_SITE_KEY = "site";
/** Where a list of plants goes: a drawn area (its id), or the site as a whole. */
export type AreaPick = number | typeof WHOLE_SITE_KEY;
/** Plants listed in one area so far (or, with no id, for the site as a whole), from the form's lines. */
const plantsIn = (lines: EventFormState["lines"], id: number | undefined) => lines.reduce((t, l) => t + (l.area === id && l.speciesId ? Number(l.quantity) || 0 : 0), 0);
const SPOT_KINDS = [["near", "New location"], ["part", "New sublocation"]] as const;
const NO_SPOT: SpotInfo = { name: "", asPart: false };
const NO_AREAS: readonly DrawnArea[] = [];

/** Plants and species recorded at each site ("slug") and part ("slug/part id"). */
export type PlantTotals = Record<string, {
  plants: number; species: number;
  /** The latest season planted (sites only), e.g. "Autumn 2025", and its place in planting order, for sorting. */
  last?: string | undefined; lastOrder?: number | undefined;
}>;

/** "1,280 plants · 30 species", or "No plants recorded yet". */
export function MapEventForm(props: MapEventFormProps) {
  const [round, setRound] = useState(0);
  // The last pick from outside taken up, kept across Start another: a fresh round mustn't take up an old pick again.
  const applied = useRef<MapEventFormProps["picked"]>(null);
  /** True the first time a pick is seen (it's then taken up), false after. */
  const takePick = useCallback((p: MapEventFormProps["picked"]) => {
    if (!p || p === applied.current) return false;
    applied.current = p;
    return true;
  }, []);
  return <Form key={round} {...props} takePick={takePick} onStartAnother={() => { setRound((r) => r + 1); props.onReset?.(); }} />;
}

function Form(props: MapEventFormProps & { onStartAnother: () => void; takePick: (p: MapEventFormProps["picked"]) => boolean }) {
  const { options, today, initialSite, plantedArea, suggestions, picked, onSiteChange, spot, spotInfo = NO_SPOT, pinMoved, hidden, onStartAnother } = props;
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const form = useEventForm({ options, today, formRef, headingRef, initialSite, initialPart: props.initialPart, steps: MAP_EVENT_STEPS, newSite: !!spot, save: props.onSave });
  // Phones: the footer gets out of the way while the page scrolls down the plant list.
  const scrollRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLElement>(null);
  useHideOnScroll(scrollRef, footRef, true);
  // A new location with no site chosen is a new site of its own.
  const newSite = !!spot && !form.site;
  const spotName = spotInfo.name.trim();
  // How the summary describes a new location: no coordinates, just what it is to the site.
  const location = newSite ? null
    : spot ? `${spotInfo.asPart ? "New sublocation" : "New location"}${spotName ? `: ${spotName}` : ""}`
    : pinMoved ? "Site's pin moved (not saved yet)" : null;
  // The summary's site: a new site's name, as the site list doesn't have it.
  const describe = (input: Parameters<typeof describeEvent>[0]) => {
    const out = describeEvent(input, options);
    return input.placeSlug === NEW_SITE ? { ...out, site: spotName ? `${spotName} (new site)` : "New site" } : out;
  };
  // Add location only: the new location without a planting (not every location has one yet).
  const [locationOnly, setLocationOnly] = useState(false);

  // Page changes slide in a little from the side they come from: forward from the right (the form shown again, a
  // receipt), back from the left (the form after its receipt). Plays once, then the class is taken off again.
  const [slide, setSlide] = useState<"forward" | "back" | null>(null);
  const [wasHidden, setWasHidden] = useState(!!hidden);
  const [wasOnReceipt, setWasOnReceipt] = useState(false);
  const onReceipt = form.preview !== null || (locationOnly && !!spot);
  if (!!hidden !== wasHidden) {
    setWasHidden(!!hidden);
    if (!hidden) setSlide("forward");
  }
  if (onReceipt !== wasOnReceipt) {
    setWasOnReceipt(onReceipt);
    if (!onReceipt) setSlide("back");
  }

  const areas = props.areas ?? NO_AREAS;
  // The part, or the site: what an area is a piece of, and where plants in no area count.
  const partName = form.site?.parts.find((p) => p.id === form.parcelId)?.name;
  const place = form.site ? (partName ? partBesideSite(partName, form.site.name) : form.site.name) : spotName || "New site";
  // What was planted, place by place: each drawn area with plants, then any for the site as a whole.
  // Each is, in effect, a planting event of its own. With no areas, one card for the site (and part).
  const byId = new Map(options.species.map((x) => [x.id, x]));
  const photos = new Map(suggestions.map((x) => [x.speciesId, x.photo]));
  const cardsFor = (input: PlantingEventInput | null): PlaceCard[] => {
    if (!input) return [];
    const card = (key: string, title: string, sub: string | undefined, lines: PlantingEventInput["species"], extra: Partial<PlaceCard> = {}): PlaceCard => ({
      key, title, sub, ...extra,
      total: lines.reduce((t, l) => t + l.quantity, 0),
      rows: lines.map((l) => {
        const sp = byId.get(l.speciesId);
        return { key: l.speciesId, name: sp?.name ?? "Unknown species", italic: sp?.isScientific, figure: formatNumber(l.quantity), photo: photos.get(l.speciesId) ?? null };
      }),
    });
    // A new location names its own card, as the panel's title does.
    if (!areas.length && spot) {
      const what = newSite ? "New site" : spotKind(spotInfo.asPart, form.site?.name ?? "");
      return [card("all", spotName || (spotInfo.asPart ? "New sublocation" : "New location"), what, input.species)];
    }
    if (!areas.length) return [card("all", form.site && partName ? `${form.site.name} · ${partBesideSite(partName, form.site.name)}` : place, undefined, input.species)];
    return [
      ...areas.map((a, i) => card(String(a.id), areaName(a, i), `${areaHa(a)} · ${place}`, input.species.filter((l) => l.area === a.id), { pts: a.pts, pick: a.id })),
      card("whole", "Whole site", `${place}, not in a drawn area`, input.species.filter((l) => l.area === undefined), { pick: WHOLE_SITE_KEY }),
    ].filter((c) => c.rows.length);
  };
  const cards = cardsFor(form.checkedEvent);
  // Areas with no plants aren't planting events: the check notes each (fill it, or take it off), but Submit doesn't wait.
  const emptyAreas = areas.filter((a) => plantsIn(form.lines, a.id) === 0);
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

  const { onEntries } = props;
  const entered = form.lines.some((l) => l.speciesId) || !!form.notes.trim();
  useEffect(() => {
    onEntries?.({ entered, saved: form.saved, partly: form.partlySaved, saving: form.saving });
  }, [entered, form.saved, form.partlySaved, form.saving, onEntries]);
  // Always, even with no site: the host shows the site in the header and title, so it must never keep an old one.
  useEffect(() => { onSiteChange?.(form.placeSlug, form.parcelId); }, [form.placeSlug, form.parcelId, onSiteChange]);
  // Take up each new pick once, so choosing another site in the form afterwards isn't undone.
  // A new key from the host starts empty, so the fresh form takes up the latest pick; Start another doesn't (see MapEventForm).
  const { takePick } = props;
  useEffect(() => {
    if (!picked || !takePick(picked)) return;
    if (form.partlySaved) return; // the event's row is saved at its place
    form.chooseSite(picked.slug);
    if (picked.parcelId) form.setParcelId(picked.parcelId);
  });
  // Opened again (it stays mounted while hidden): from the top, not where it was left. Before the
  // Add plants effect below, so that one's scroll to the list wins.
  useEffect(() => {
    if (!hidden) scrollRef.current?.scrollTo(0, 0);
  }, [hidden]);
  // The same for an area's Add plants on the map: take each one up once (from the receipt too), and scroll to the list.
  const { plantIn } = props;
  // Starts at the request already there: a fresh form (e.g. remounted when the screen crosses the wide
  // breakpoint) mustn't jump to the plant list for an old Add plants.
  const plantApplied = useRef<typeof plantIn>(plantIn);
  // Opened from the map: the list has Done, back to the map (phones), until it's used or the form is put away.
  const [fromMap, setFromMap] = useState(false);
  if (hidden && fromMap) setFromMap(false);
  // Saved: the receipt stays (back in the form, Submit would save it again); Start another begins the next.
  const [askedIn, setAskedIn] = useState(plantIn);
  if (plantIn !== askedIn) {
    setAskedIn(plantIn);
    if (plantIn && !form.saved) setFromMap(true);
  }
  useEffect(() => {
    if (!plantIn || plantIn === plantApplied.current) return;
    plantApplied.current = plantIn;
    if (form.saved) return;
    if (form.preview) form.closePreview();
    requestAnimationFrame(() => listRef.current?.scrollIntoView({ block: "start" }));
  }, [plantIn, form]);

  const { onSavedAtSpot } = props;
  const savedAtSpot = form.saved && !!spot;
  useEffect(() => { if (savedAtSpot) onSavedAtSpot?.(); }, [savedAtSpot, onSavedAtSpot]);
  // A place kept from earlier this visit, not stored: its plants are saved at its site, as at a new location.
  const keptHere = form.site?.unsaved || !!form.site?.parts.find((p) => p.id === form.parcelId)?.unsaved;
  // What the receipt says isn't stored, as it was when Submit passed (a new location, drawn areas), not as the map is after.
  const [atSubmit, setAtSubmit] = useState<{ unstored?: string | undefined; areas: boolean } | null>(null);
  if (form.preview && !atSubmit) {
    setAtSubmit({
      // A new location at a known site: its plants are saved at that site, the location itself not yet.
      unstored: spot && form.site ? `The ${spotInfo.asPart ? "new sublocation" : "new location"} isn’t stored yet: its plants are saved at ${place}.`
        : keptHere && form.site ? `The new location isn’t stored yet: its plants are saved at ${form.site.name}.` : undefined,
      areas: areas.length > 0,
    });
  }
  if (!form.preview && atSubmit) setAtSubmit(null);

  if (locationOnly && spot) {
    const what = newSite ? "New site" : spotKind(spotInfo.asPart, form.site!.name);
    return <LocationPreview hidden={hidden} name={spotName} what={what} plantedArea={plantedArea} onBack={() => setLocationOnly(false)} onSave={props.onKeepLocation ?? onStartAnother} />;
  }
  if (form.preview) {
    return (
      <Receipt
        hidden={hidden} summary={describe(form.preview)} cards={cardsFor(form.preview)} empty={emptyAreas.map((a) => areaName(a, areas.indexOf(a)))} saved={form.saved}
        unstored={form.saved ? atSubmit?.unstored : undefined} areasDrawn={!!atSubmit?.areas} onBack={form.closePreview} onStartAnother={onStartAnother} onFinish={props.onFinish}
      />
    );
  }

  // Saving makes one event (its areas' plants added together); the preview counts each area's as one.
  const submit = cards.length > 1 && !props.onSave ? `Submit ${cards.length} planting events` : "Submit planting event";
  // The plant list says what's wrong with it there; anything else is said at the top.
  const placeErrors = Object.keys(form.errors).some((path) => !path.startsWith("species") && path !== "notes");

  return (
    <form
      ref={formRef} className={cn(s.form, slide === "forward" && s.slideIn, slide === "back" && s.slideBack)}
      onAnimationEnd={(e) => { if (e.target === e.currentTarget) setSlide(null); }} onSubmit={form.submit} onKeyDown={enterStaysInField} noValidate aria-label="New planting event" hidden={hidden}>
      {/* The panel's header already names the site; the tiles below say where and when. On phones the
          top bar says "New planting event" too, so only a new location's question shows there. */}
      <header className={s.head} data-repeat="">
        <h2 ref={headingRef} tabIndex={-1} className={s.title}>{spot ? "Where is it?" : "New planting event"}</h2>
      </header>

      <div ref={scrollRef} className={s.scroll}>
        {placeErrors && (
          <div className="cn-callout cn-callout--risk cn-callout--sm" role="alert">
            {form.errors.form ?? "Some details need fixing. They are marked below."}
          </div>
        )}
        {/* Add the location on its own only with nothing entered: its Start another would clear the plants. */}
        <WhereWhen {...props} form={form} onLocationOnly={entered || areas.length ? undefined : () => setLocationOnly(true)} />
        <WhatPlanted
          ref={listRef} form={form} options={options} suggestions={suggestions} areas={areas} plantIn={plantIn} onDrawArea={props.onDrawArea} onAreaFocus={props.onAreaFocus} hidden={hidden}
          onFocus={props.onListFocus}
          // Opened from an area's Add plants: a way back to the map (on phones) that isn't Back.
          onDone={fromMap ? () => { setFromMap(false); props.onPlantClose?.(); } : undefined}
        />
        {/* After the list: a new location or a moved pin said quietly, then the note, then Submit. */}
        {location && <p className={s.quiet}>{location}</p>}
        <Notes form={form} />
      </div>

      {form.saveError && <div className="cn-callout cn-callout--risk cn-callout--sm" role="alert">{form.saveError}</div>}
      <footer ref={footRef} className={s.foot}>
        {props.onBack && <button type="button" className={s.back} onClick={props.onBack}>Back</button>}
        <button type="submit" className={s.next} disabled={form.saving} aria-busy={form.saving}>
          {form.saving ? <><Spinner aria-hidden="true" />Saving…</> : submit}
        </button>
      </footer>
      {!props.onSave && <p className={s.note}>Prototype: Submit checks everything, but nothing is saved yet.</p>}
    </form>
  );
}

/** The date, and the season it falls in (always the date's). Tap anywhere on it to change the date. */
function When({ form, today }: { form: EventFormState; today: string }) {
  // The event's row is saved (its plants weren't): the date stays as saved.
  const { err } = form;
  return (
    <section className={s.group} aria-label="When">
      {/* The whole tile opens the calendar. */}
      <DatePicker
        value={form.plantedOn} max={today} onChange={form.changeDate} className={s.pick} disabled={form.partlySaved}
        aria-label={`${form.plantedOn ? formatPlantedOn(form.plantedOn) : "No date"}, ${form.season} ${form.seasonYear}: change the planting date`} aria-invalid={!!err("plantedOn")}
      >
        <Calendar size={18} strokeWidth={2} aria-hidden="true" />
        <span>
          {/* Short, to fit half a phone's width (the label above has it in full). */}
          <b>{form.plantedOn ? shortDate(form.plantedOn, today) : "Choose a date"}</b>
          <small>{form.season} {form.seasonYear}</small>
        </span>
      </DatePicker>
      {err("plantedOn") && <p className={s.problem} role="alert">{err("plantedOn")}</p>}
      {err("season") && <p className={s.problem} role="alert">{err("season")}</p>}
    </section>
  );
}

/** Notes are rare: a link until asked for (open already with a note, or a problem with it). */
function Notes({ form }: { form: EventFormState }) {
  const [open, setOpen] = useState(false);
  if (form.partlySaved && !form.notes) return null; // saved with the event: nothing to add now
  if (!open && !form.notes && !form.err("notes")) {
    return (
      <button type="button" className={cn(s.inlineLink, s.addNote)} onClick={() => setOpen(true)}>
        <Plus size={15} strokeWidth={2.6} aria-hidden="true" />Add a note
      </button>
    );
  }
  return (
    <TextareaInput
      label="Notes" optional rows={3} autoComplete="off" maxLength={NOTES_MAX} value={form.notes} error={form.err("notes")} autoFocus={open && !form.notes}
      placeholder="Who planted, conditions, anything WRT should know"
      onChange={(e) => form.setNotes(e.target.value)} disabled={form.partlySaved}
    />
  );
}

/**
 * Where and when, confirmed up front. The site on a mini map first, then under it the site and
 * part (tap to open the chooser) and the date with its season, then the areas drawn on the map. Past
 * plantings are on the site's page. A new location gets its name and pin instead of the place row.
 */
function WhereWhen({ form, today, plantedArea, onChooseSite, placeMenu, spot, spotNear, spotKm, areaKm, nearKm = 0, onAddSpot, onRemoveSpot, spotInfo = NO_SPOT, onSpotInfo, areas = NO_AREAS, onShowArea, areasListed, onLocationOnly }: MapEventFormProps & { form: EventFormState; onLocationOnly?: (() => void) | undefined }) {
  const { err } = form;
  // A new location with no site chosen is a new site of its own; it can still be put at one.
  const newSite = !!spot && !form.site;
  const siteProblem = err("placeSlug") ?? err("parcelId");
  const partName = form.site?.parts.find((p) => p.id === form.parcelId)?.name;
  const far = !!spot && !!form.site && spotKm != null && spotKm > nearKm;
  const atKnown = newSite && !!spotNear && spotNear.km <= nearKm;

  return (
    <>
      {/* The map first: where it is; then the place and the date under it (with a site, in one card). */}
      {(spot || !form.site) && plantedArea}
      {!spot && !form.site && (
        <section className={s.group} aria-label="Site">
          <button type="button" className={s.choosePrompt} onClick={onChooseSite} data-problem={siteProblem ? "" : undefined}>
            {siteProblem ?? "Choose a site, or tap its pin on the map"}
            <ChevronRight size={18} strokeWidth={2.4} />
          </button>
        </section>
      )}
      {!spot && form.site ? (
        // One card: the map on top, then where and when side by side, each a tile you tap to change:
        // the site and part (the site chooser), then the date.
        <div className={s.whereCard}>
          {plantedArea}
          <div className={s.picks}>
            {(() => {
              const label = `${form.site.name}, ${partName ? partBesideSite(partName, form.site.name) : "whole site"}: change the part or site`;
              const children = (
                <>
                  <MapPin size={18} strokeWidth={2} aria-hidden="true" />
                  <span><b>{form.site.name}</b><small>{partName ? partBesideSite(partName, form.site.name) : "Whole site"}</small></span>
                </>
              );
              return placeMenu && !form.partlySaved
                ? placeMenu({ className: s.pick!, label, children })
                : <button type="button" className={s.pick} onClick={onChooseSite} disabled={!onChooseSite || form.partlySaved} aria-label={label}>{children}</button>;
            })()}
            <When form={form} today={today} />
          </div>
        </div>
      ) : <When form={form} today={today} />}
      {/* Drawn areas far from the event's site: the same quiet note as for a location. */}
      {!spot && form.site && areaKm != null && areaKm > nearKm && (
        <p className="cn-callout cn-callout--note cn-callout--sm" role="status">
          That&apos;s {kmLabel(areaKm)} from {form.site.name}: is that the right site?{" "}
          {onChooseSite && <button type="button" className={s.inlineLink} onClick={onChooseSite}>Choose a known site</button>}
        </p>
      )}
      {!spot && form.site && ((areas.length > 0 && !areasListed) || err("parcelId")) && (
        // Parts are switched in the panel's header (or the map's dock); areas are drawn and new locations
        // dropped from the map.
        <section className={s.group} aria-label="Where it was planted">
          {/* The drawn areas by name, not a count: tap one to see it on the map (where its pencil and Add plants are). */}
          {areas.length > 0 && !areasListed && (
            <ul className={s.areaList} aria-label="Planted areas">
              {areas.map((a, i) => {
                const n = plantsIn(form.lines, a.id);
                return (
                  <li key={a.id}>
                    <button type="button" onClick={() => onShowArea?.(a.id)} aria-label={`${areaName(a, i)}, ${areaHa(a)}, ${plantsOrNone(n).toLowerCase()}: show on the map`}>
                      <AreaShape pts={a.pts} />
                      <span className={s.cardText}>
                        <b>{areaName(a, i)}</b>
                        <span>{areaHa(a)} · {plantsOrNone(n)}</span>
                      </span>
                      <MapIcon size={18} strokeWidth={2.2} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {err("parcelId") && <p className={s.problem} role="alert">{err("parcelId")}</p>}
        </section>
      )}
      {spot && siteProblem && (
        // One line that says what's wrong and opens the chooser.
        <div role="alert">
          <button type="button" className={s.choosePrompt} onClick={onChooseSite} data-problem="">
            {siteProblem}
            <ChevronRight size={18} strokeWidth={2.4} />
          </button>
        </div>
      )}
      {spot && (
        // The new location: its name (type to change it), how near the site's pin it is,
        // what it is to the site, and Cancel / Move pin.
        <div className={cn(s.card, s.spotCard)}>
          <div className={s.spotHead}>
            <span className={s.cardIcon} aria-hidden="true"><MapPin size={20} strokeWidth={2} /></span>
            <span className={s.cardText}>
              <label className={s.spotName}>
                <span className="sr-only">Label for the new location</span>
                <input name="planting-location-label" value={spotInfo.name} placeholder="Location label, e.g. Top terrace" onChange={(e) => onSpotInfo?.({ ...spotInfo, name: e.target.value })} {...NAME_FIELD} enterKeyHint="done" />
                <Pencil size={16} strokeWidth={2.2} />
              </label>
              {/* What it is, and how far from its site's pin (a new site: the nearest pin). */}
              {form.site && spotKm != null ? (
                <span>{spotKind(spotInfo.asPart, form.site.name)} · {fromPin(spotKm, "its pin")}</span>
              ) : newSite && spotNear && <span>New site · nearest {spotNear.label}, {kmLabel(spotNear.km)}</span>}
            </span>
          </div>
          {/* The kind is a choice only for a plain new location near a site (a sublocation or a new site was asked for). */}
          {form.site && !spotInfo.decided && (
            <Segmented
              label={`What this location is to ${form.site.name}`} options={SPOT_KINDS} value={spotInfo.asPart ? "part" : "near"}
              onChange={(kind) => onSpotInfo?.({ ...spotInfo, asPart: kind === "part" })}
            />
          )}
          {/* Placed far from its site, or a new site right by a known one: said quietly, not blocking. */}
          {far && <p className="cn-callout cn-callout--note cn-callout--sm" role="status">That&apos;s {kmLabel(spotKm!)} from {form.site?.name}: is that the right site?</p>}
          {atKnown && <p className="cn-callout cn-callout--note cn-callout--sm" role="status">This is {kmLabel(spotNear!.km)} from {spotNear!.label}: part of it?</p>}
          {/* Back out plainly (the form goes back to the site as it was), or say it's at a site we know. One row. */}
          <div className={s.spotActions}>
            {onRemoveSpot && <button type="button" className={s.spotCancel} onClick={onRemoveSpot} aria-label="Cancel new location"><X size={16} strokeWidth={2.6} />Cancel</button>}
            {(newSite || far) && onChooseSite && <button type="button" className={s.link} onClick={onChooseSite}>Choose a known site</button>}
            {onAddSpot && <button type="button" className={s.link} onClick={onAddSpot}>Move pin</button>}
          </div>
        </div>
      )}
      {spot && onLocationOnly && (
        // Not every location has a planting yet: it can go in on its own.
        <button type="button" className={s.locationOnly} onClick={onLocationOnly}>
          <span><b>No planting yet?</b> Add the location on its own</span>
          <ChevronRight size={18} strokeWidth={2.4} />
        </button>
      )}
    </>
  );
}

function WhatPlanted({ ref, form, options, suggestions, areas, plantIn, onDrawArea, onAreaFocus, onFocus, onDone, hidden }: {
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
  const { err } = form;
  const [query, setQuery] = useState("");
  // Problems shown (Submit): a quantity's problem on a line out of view (another search, another area) brings it into view, so it can take focus.
  const [shownAsk, setShownAsk] = useState(form.problemAsk);
  if (form.problemAsk !== shownAsk) {
    setShownAsk(form.problemAsk);
    const bad = Object.keys(form.errors).map((path) => /^species\.(\d+)\./.exec(path)?.[1]).find((i) => i !== undefined);
    const line = bad === undefined ? undefined : form.lines[Number(bad)];
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
    if (i < 0) {
      if (!value.trim()) return;
      if (!listedIds.has(speciesId)) setKept({ query, ids: new Set([...keptIds, speciesId]) });
      form.addSpecies(speciesId, value, area);
      return;
    }
    const l = form.lines[i]!; // i >= 0: found above
    if (value.trim()) form.updateLine(l.key, { quantity: value });
    else if (form.lines.length > 1) form.removeLine(l.key);
    else form.updateLine(l.key, { speciesId: "", quantity: "" });
  };

  // Submit was pressed with nothing entered: say so at the list, and mark the first box so focus lands there.
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
        {qtyError && <span className={s.rowError}>{qtyError}</span>}
      </li>
    );
  };

  return (
    <section ref={ref} className={s.group} aria-labelledby="what-planted" onFocus={onFocus}>
      {/* What was planted, and the running count. */}
      <div className={s.titleRow}>
        <h3 id="what-planted" className={s.listTitle}>What did you plant?</h3>
        <span className={s.total} aria-live="polite">
          <b>{formatNumber(form.total)}</b> plants · {form.lines.filter((l) => l.speciesId).length} species
        </span>
        {onDone && (
          <button type="button" className={s.closeList} onClick={onDone}>
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
            { key: WHOLE_SITE_KEY, title: wholeName, subtitle: wholeLine, lead: (size: number) => <span className={s.siteTile} style={{ width: size, height: size, borderRadius: Math.round(size * 0.27) }}><MapPin size={Math.round(size * 0.46)} strokeWidth={2.2} aria-hidden="true" /></span> },
          ]}
        />
      )}

      <div className={s.searchBar} data-pinned="">
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

      {/* The site's own species first (the order says they were planted here before), then the rest under a quiet divider. */}
      {shown.length > 0 && <ul className={s.rows}>{shown.map((sp, n) => row(sp, n === 0))}</ul>}
      {more.length > 0 && (
        <>
          {shown.length > 0 && <p className={s.rowsDivider}>{query.trim() ? "Other species" : "All species"}</p>}
          <ul className={s.rows}>{more.map((sp, n) => row(sp, shown.length === 0 && n === 0))}</ul>
        </>
      )}
      {query.trim() && shown.length === 0 && more.length === 0 && (
        <p className={s.empty}>No species matches “{query.trim()}”.</p>
      )}
    </section>
  );
}

/** One place planted: a drawn area (its outline), or the site as a whole (its pin). Each is, in effect, a planting event. */
interface PlaceCard { key: string; title: string; sub?: string | undefined; pts?: DrawnArea["pts"] | undefined; pick?: AreaPick | undefined; rows: FigureRow[]; total: number }
const plantsLabel = (n: number) => `${formatNumber(n)} ${n === 1 ? "plant" : "plants"}`;
const cardLead = (c: PlaceCard) => (c.pts ? <AreaShape pts={c.pts} size={44} onMap /> : <span className={s.pinTile}><MapPin size={20} strokeWidth={2.2} /></span>);


/** What Submit shows: a short receipt, marked "Saved", or plainly "Not saved" when the form can't save. */
function Receipt({ hidden, summary, cards, empty, saved, unstored, areasDrawn, onBack, onStartAnother, onFinish }: {
  hidden?: boolean | undefined;
  /** Areas were drawn: they aren't stored yet, so it says so. */
  areasDrawn: boolean;
  /** Said under the heading: what of it isn't stored (a new location's own record). */
  unstored?: string | undefined;
  summary: EventSummary; cards: PlaceCard[];
  /** Areas kept with no plants (their names): said in a line, so they aren't silently dropped. */
  empty: string[];
  /** The event and its plants were saved: no going back to the form (it would save them again). */
  saved: boolean;
  onBack: () => void; onStartAnother: () => void;
  /** Saved: out of the form, e.g. to the site's page, where the new planting shows. */
  onFinish?: { label: string; onClick: () => void } | undefined;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  const where = summary.part === WHOLE_SITE ? summary.site : `${summary.site} · ${partBesideSite(summary.part, summary.site)}`;
  return (
    <div className={cn(s.form, s.slideIn)} hidden={hidden}>
      <header className={s.head}>
        <Badge tone={saved ? "ok" : "review"} className={s.badge}>{saved ? "Saved" : "Not saved"}</Badge>
        <h2 ref={headingRef} tabIndex={-1} className={s.title}>{saved || cards.length === 1 ? "1 planting event" : `${cards.length} planting events`}</h2>
        <p className={s.context} role="status">
          <span>{saved ? `The planting event and its plants are saved.${areasDrawn ? " Drawn areas aren’t stored yet." : ""}` : "Everything checks out. This prototype can’t store events yet."}</span>
          {unstored && <span>{unstored}</span>}
        </p>
      </header>
      <div className={s.scroll}>
        <p className={s.receipt}>
          <b>{plantsLabel(summary.total)}</b> at {where}
          <span>{summary.date} · {summary.season}</span>
        </p>
        <FigureList title="Where" rows={cards.map((c) => ({ key: c.key, name: c.title, sub: c.sub, lead: cardLead(c), figure: plantsLabel(c.total) }))} />
        {empty.length > 0 && <p className={s.quiet}>{listed(empty)} kept with no plants.</p>}
      </div>
      <footer className={s.foot}>
        {!saved && <button type="button" className={s.back} onClick={onBack}>Back to the form</button>}
        {saved && onFinish && <button type="button" className={s.back} onClick={onFinish.onClick}>{onFinish.label}</button>}
        <button type="button" className={s.next} onClick={onStartAnother}>Start another</button>
      </footer>
    </div>
  );
}

/** Add location only: the new location on its own, with no planting. Not saved. */
function LocationPreview({ hidden, name, what, plantedArea, onBack, onSave }: {
  hidden?: boolean | undefined; name: string; what: string; plantedArea?: ReactNode | undefined; onBack: () => void;
  /** Keeps the location for this visit (a place to choose, marked "Not saved yet"). */
  onSave: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  return (
    <div className={cn(s.form, s.slideIn)} hidden={hidden}>
      <header className={s.head}>
        <Badge tone="review" className={s.badge}>Not saved</Badge>
        <h2 ref={headingRef} tabIndex={-1} className={s.title}>New location preview</h2>
        <p className={s.context} role="status"><span>No planting yet: that can be added later. This prototype can’t store locations yet.</span></p>
      </header>
      <div className={s.scroll}>
        {plantedArea}
        <FigureList
          title="Where"
          rows={[{ key: "spot", name: name || "Not named yet", sub: what, figure: "No plants yet", lead: <span className={s.pinTile}><MapPin size={20} strokeWidth={2.2} /></span> }]}
        />
      </div>
      <footer className={s.foot}>
        <button type="button" className={s.back} onClick={onBack}>Back to the form</button>
        <button type="button" className={s.next} onClick={onSave}>Save location</button>
      </footer>
    </div>
  );
}

/** "A", "A and B", "A, B and C". */
function listed(names: string[]) {
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

