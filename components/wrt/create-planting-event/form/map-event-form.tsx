"use client";
/**
 * The planting-event form for the map view (state and checks in useEventForm), on one scrolling page laid out
 * for a panel over the map: where and when first (where-when.tsx), then what was planted (what-planted.tsx),
 * an optional note (note-button.tsx), then Submit, which shows the receipt (receipt.tsx).
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner";
import { enterStaysInField } from "@/components/wrt/shared/fields";
import type { PlantingEventSubmitResult } from "@/db/types";
import type { EventFormOptions } from "@/lib/wrt/events/form-options";
import type { SpeciesSuggestion } from "@/lib/wrt/events/site-suggestions";
import { describeEvent } from "@/lib/wrt/events/summary";
import type { PlantingEventInput } from "@/lib/wrt/events/types";
import { partBesideSite, spotKind } from "@/lib/wrt/text";
import { cn } from "@/lib/utils";
import { NoteButton } from "./note-button";
import { LocationPreview, Receipt, type PlaceCard } from "./receipt";
import { areaHa, areaName, NEW_SITE, plantsIn, useEventForm, WHOLE_SITE_KEY, type AreaPick, type DrawnArea } from "./use-event-form";
import { useHideOnScroll } from "./use-hide-on-scroll";
import { WhatPlanted } from "./what-planted";
import { WhereWhen } from "./where-when";
import s from "../panel.module.css";
import * as panel from "../panel-classes";

export { WHOLE_SITE_KEY, type AreaPick };

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
  picked?: { slug: string; partId: string | null } | null;
  /** Tells the host when the site or part changes, so the map can move its pin. */
  onSiteChange?: ((siteSlug: string, partId: string | null) => void) | undefined;
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
const NO_SPOT: SpotInfo = { name: "", asPart: false };
const NO_AREAS: readonly DrawnArea[] = [];

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
  const form = useEventForm({ options, today, formRef, headingRef, initialSite, initialPart: props.initialPart, newSite: !!spot, save: props.onSave });
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
    return input.siteSlug === NEW_SITE ? { ...out, site: spotName ? `${spotName} (new site)` : "New site" } : out;
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
  const partName = form.site?.parts.find((p) => p.id === form.partId)?.name;
  const place = form.site ? (partName ? partBesideSite(partName, form.site.name) : form.site.name) : spotName || "New site";
  // What was planted, place by place: each drawn area with plants, then any for the site as a whole.
  // Each is, in effect, a planting event of its own. With no areas, one card for the site (and part).
  const cardsFor = (input: PlantingEventInput | null): PlaceCard[] => {
    if (!input) return [];
    const card = (key: string, title: string, sub: string | undefined, lines: PlantingEventInput["species"], pts?: DrawnArea["pts"]): PlaceCard => ({
      key, title, sub, pts, total: lines.reduce((t, l) => t + l.quantity, 0),
    });
    // A new location names its own card, as the panel's title does.
    if (!areas.length && spot) {
      const what = newSite ? "New site" : spotKind(spotInfo.asPart, form.site?.name ?? "");
      return [card("all", spotName || (spotInfo.asPart ? "New sublocation" : "New location"), what, input.species)];
    }
    if (!areas.length) return [card("all", form.site && partName ? `${form.site.name} · ${partBesideSite(partName, form.site.name)}` : place, undefined, input.species)];
    return [
      ...areas.map((a, i) => card(String(a.id), areaName(a, i), `${areaHa(a)} · ${place}`, input.species.filter((l) => l.area === a.id), a.pts)),
      card("whole", "Whole site", `${place}, not in a drawn area`, input.species.filter((l) => l.area === undefined)),
    ].filter((c) => c.total > 0);
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
    for (const l of form.lines) if (l.area !== undefined) out[l.area] = (out[l.area] ?? 0) + (Number(l.quantity) || 0);
    onAreaPlants?.(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- plantsKey is what the lines say
  }, [plantsKey, onAreaPlants]);

  const { onEntries } = props;
  const entered = form.lines.length > 0 || !!form.notes.trim();
  useEffect(() => {
    onEntries?.({ entered, saved: form.saved, partly: form.partlySaved, saving: form.saving });
  }, [entered, form.saved, form.partlySaved, form.saving, onEntries]);
  // Always, even with no site: the host shows the site in the header and title, so it must never keep an old one.
  useEffect(() => { onSiteChange?.(form.siteSlug, form.partId); }, [form.siteSlug, form.partId, onSiteChange]);
  // Take up each new pick once, so choosing another site in the form afterwards isn't undone.
  // A new key from the host starts empty, so the fresh form takes up the latest pick; Start another doesn't (see MapEventForm).
  const { takePick } = props;
  useEffect(() => {
    if (!picked || !takePick(picked)) return;
    if (form.partlySaved) return; // the event's row is saved at its place
    form.chooseSite(picked.slug, picked.partId);
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
  const keptHere = form.site?.unsaved || !!form.site?.parts.find((p) => p.id === form.partId)?.unsaved;
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
  const placeErrors = Object.keys(form.errors).some((path) => path !== "species" && path !== "notes");

  return (
    <form
      ref={formRef} className={cn(panel.form, slide === "forward" && s.slideIn, slide === "back" && s.slideBack)}
      onAnimationEnd={(e) => { if (e.target === e.currentTarget) setSlide(null); }} onSubmit={form.submit} onKeyDown={enterStaysInField} noValidate aria-label="New planting event" hidden={hidden}>
      {/* The panel's header already names the site; the tiles below say where and when. On phones the
          top bar says "New planting event" too, so only a new location's question shows there. */}
      <header className={panel.head} data-repeat="">
        <h2 ref={headingRef} tabIndex={-1} className={panel.title}>{spot ? "Where is it?" : "New planting event"}</h2>
      </header>

      <div ref={scrollRef} className={panel.scroll}>
        {placeErrors && (
          <div className="cn-callout cn-callout--risk cn-callout--sm" role="alert">
            Some details need fixing. They are marked below.
          </div>
        )}
        {/* Add the location on its own only with nothing entered: its Start another would clear the plants. */}
        <WhereWhen {...props} form={form} spotInfo={spotInfo} areas={areas} onLocationOnly={entered || areas.length ? undefined : () => setLocationOnly(true)} />
        <WhatPlanted
          ref={listRef} form={form} options={options} suggestions={suggestions} areas={areas} plantIn={plantIn} onDrawArea={props.onDrawArea} onAreaFocus={props.onAreaFocus} hidden={hidden}
          onFocus={props.onListFocus}
          // Opened from an area's Add plants: a way back to the map (on phones) that isn't Back.
          onDone={fromMap ? () => { setFromMap(false); props.onPlantClose?.(); } : undefined}
        />
        {/* After the list: a new location or a moved pin said quietly, then Submit. */}
        {location && <p className={panel.quiet}>{location}</p>}
      </div>

      {form.saveError && <div className="cn-callout cn-callout--risk cn-callout--sm" role="alert">{form.saveError}</div>}
      <footer ref={footRef} className={panel.foot}>
        {props.onBack && <button type="button" className={panel.back} onClick={props.onBack}>Back</button>}
        <NoteButton form={form} />
        <button type="submit" className={panel.next} disabled={form.saving} aria-busy={form.saving}>
          {form.saving ? <><Spinner aria-hidden="true" />Saving…</> : submit}
        </button>
      </footer>
      {!props.onSave && <p className="m-0 px-0 pt-0 pb-2 text-center font-sans text-[12.5px] leading-[1.4] font-normal text-[var(--text-muted)] max-md:[[data-away]+&]:hidden [html[data-keyboard]_&]:hidden">Prototype: Submit checks everything, but nothing is saved yet.</p>}
    </form>
  );
}
