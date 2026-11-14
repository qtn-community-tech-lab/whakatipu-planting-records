"use client";
/**
 * The planting event page: a full-screen satellite map with a pin for every site, and the planting-event
 * form over it. This file only wires together the parts in the files beside it.
 */
import type { Route } from "next";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { MapEventForm, WHOLE_SITE_KEY, type AreaPick, type FormEntries, type MapEventFormProps, type SpotInfo } from "./form/map-event-form";
import type { EventFormOptions } from "@/lib/wrt/events/form-options";
import type { SpeciesSuggestion } from "@/lib/wrt/events/site-suggestions";
import { fromPin, partBesideSite, spotKind } from "@/lib/wrt/text";
import { FormPanel, SHEET_HEIGHT, type Snap } from "@/components/wrt/shared/form-panel";
import { MiniMap, NEW_PIN_CLASS } from "@/components/wrt/shared/mini-map";
import { paddingFor } from "./map/layout";
import { keptPin, kmToNearest, nearestPin, pinFor, sitePins, withKept, type KeptPlace, type LngLat, type PlantTotals, type SitePin } from "./map/sites";
import { PartMenu } from "./site/part-menu";
import { SiteOverview } from "./site/site-overview";
import { PastSeason } from "./seasons/past-season";
import type { SavePlantingEventEdit } from "./seasons/edit-planting-event";
import { PinTooltip } from "./map/pin-tooltip";
import { SiteChooser } from "./site/site-chooser";
import { TopBar } from "./site/top-bar";
import { usePinMoves } from "./map/use-pin-moves";
import { AreaOverlay, DrawBar, useDrawArea, type OnKeep } from "./draw-area";
// The panel screen for an area (Plant here, Whole site, Close): with the page's other screens, not the map.
import { AreaSheet } from "./draw-area/area-sheet";
import { highlightSite, useCamera, useFindMe, usePlantingMap, useSpotMarker } from "./map/use-planting-map";
import { boundsOf, fitArea } from "./map/map-scene";
import { useKeyboardFit } from "./browser/use-keyboard-fit";
import { useMedia } from "./browser/use-media";
import { useLeaveGuard } from "./browser/use-leave-guard";
import { useAddressSync } from "./browser/use-address-sync";
import { useCross, type SpotNear } from "./map/use-cross";
import { initialPage, pageReducer, topOf } from "./planting-page";
import { LeaveDialogs } from "./browser/leave-dialogs";
import { AreaList, Crumbs, MapTools, useMapKeys } from "./navigator";
import s from "./create-planting-event.module.css";

const WIDE = "(min-width: 768px)";
/** A new location this close to a site's (or part's) pin counts as that site. */
const NEAR_KM = 1.5;
/** A tap on the map at least this far (px) from the chosen site's pin leaves the site. */
const AWAY_PX = 120;

export interface CreatePlantingEventProps {
  /** Site slug to start at, or "" to start with every site in view. */
  initialSite: string;
  /** A part of the initial site (its WRT number), or none for the whole site. */
  initialPart?: string | undefined;
  /** A past season to start with open, at the initial site (the initial part's, or with none the whole site's). */
  initialSeason?: { slug: string; label: string } | undefined;
  options: EventFormOptions;
  /** NZ today, "YYYY-MM-DD". */
  today: string;
  exitHref: Route;
  /** Each site's most planted species, by site slug, for the plant list. */
  suggestions: Record<string, SpeciesSuggestion[]>;
  /** Plants and species recorded at each site ("slug") and part ("slug/part id"), for the site chooser. */
  totals: PlantTotals;
  areas: Parameters<typeof sitePins>[1];
  onSave?: MapEventFormProps["onSave"];
  /** Saves an edited past planting event (the page's server action). Without it, past events can't be edited. */
  onSaveEdit?: SavePlantingEventEdit | undefined;
}

export function CreatePlantingEvent({ initialSite: siteFromAddress, initialPart, initialSeason, options, today, exitHref, suggestions, totals, areas, onSave, onSaveEdit }: CreatePlantingEventProps) {
  // Where the page opened. Only the first value counts: our address changes make Next's server refreshes (after a
  // save) render with the new address, and a new start site would rebuild the map. (Part and season only seed state.)
  const [initialSite] = useState(siteFromAddress);
  const wide = useMedia(WIDE);
  const mapEl = useRef<HTMLDivElement>(null);
  const [screen, setScreen] = useState<HTMLDivElement | null>(null);
  useKeyboardFit(screen);
  const [page, dispatch] = useReducer(pageReducer, initialSeason ? { ...initialSeason, wholeSite: !initialPart } : null, initialPage);
  const { season, started, startedFrom, snap, searchAsk } = page;
  const setSnap = (to: Snap) => dispatch({ type: "snap", to });
  const top = topOf(page);
  const choosing = top?.kind === "list";
  const areaSheet = top?.kind === "area" ? top.id : null;
  const placing = top?.kind === "placing" ? top.mode : false;
  const [basePins] = useState(() => sitePins(options.sites, areas, totals));
  // Locations added on the map this visit: listed and shown like any other place. See KeptPlace.
  const [kept, setKept] = useState<KeptPlace[]>([]);
  const sites = useMemo(() => withKept(options.sites, kept), [options.sites, kept]);
  const formOptions = useMemo(() => ({ ...options, sites }), [options, sites]);
  const allPins = useMemo(() => [...basePins, ...kept.map(keptPin)], [basePins, kept]);
  const { pins, pinAt, isMoved, move } = usePinMoves(allPins);
  // A site's pins (its own and its places'): distances to a site are to the nearest of them.
  const pinsOf = (slug: string) => pins.filter((p) => p.slug === slug).map((p) => p.at);
  // A pin clicked on the map: a new object each click, so clicking the same pin again still counts.
  const [picked, setPicked] = useState<{ slug: string; partId: string | null } | null>(null);
  const [siteSlug, setSiteSlug] = useState(initialSite);
  const [part, setPart] = useState<string | null>(initialPart ?? null);
  // What the camera centres: the new location if there is one, else the chosen site's (part's) pin.
  const [focus, setFocus] = useState<LngLat | null>(null);
  const site = sites.find((x) => x.slug === siteSlug);
  const siteName = site?.name ?? "Choose a site";
  const partName = site ? site.parts.find((p) => p.id === part)?.name ?? "Whole site" : undefined;
  // Beside the site's name, the part without the site in front of it: "Morning Star Reserve", not "Arthurs Point - Morning Star Reserve".
  const partShort = partName && site ? partBesideSite(partName, site.name) : partName;
  const keptPart = !!site?.parts.find((p) => p.id === part)?.unsaved;
  const closeSheet = () => dispatch({ type: "closeArea" });
  const changeSite = () => dispatch({ type: "openList", wide });
  const closeChooser = (back = false) => dispatch({ type: "closeList", wide, back });
  const searchSites = () => dispatch({ type: "search", wide, allSites });
  // An event with entries at another site asks first, as choosing that site does.
  function addSublocation(slug: string) {
    unlessEditing(() => {
      if (started && siteSlug && slug !== siteSlug && eventUnsaved) return setPendingSite({ slug, partId: null, run: () => startCross("part", slug) });
      startCross("part", slug);
    });
  }
  // The header pill and the phone title toggle it; everything else that asks for a site only ever opens it.
  const toggleChooser = () => (choosing ? closeChooser(true) : changeSite());
  // Another site, with an event's entries here, asks first: they move with it. `run` replaces choosing the site.
  const [pendingSite, setPendingSite] = useState<{ slug: string; partId: string | null; run?: () => void } | null>(null);
  function chooseSite(slug: string, partId: string | null) {
    if (slug === siteSlug && partId === part) return moveTo(slug, partId);
    // The event is saved: another site or part is a fresh start there, not a change to it.
    if (started && entry.saved) return leaveFor({ slug, partId });
    // Saved without its plants: its place can't change, so another one leaves it (asking first).
    if (entry.partly) return setLeaving({ to: sites.find((x) => x.slug === slug)?.name ?? "that site", run: () => leaveFor({ slug, partId }) });
    // Another site or part closes an open season: ask first if a past planting there has unsaved changes.
    unlessEditing(() => {
      // Entries kept from an event (after its Back) would go to the other site unseen: leaving clears them, so it asks.
      if (!started && eventUnsaved && slug !== siteSlug) return setLeaving({ to: sites.find((x) => x.slug === slug)?.name ?? "that site", run: () => leaveFor({ slug, partId }) });
      moveTo(slug, partId);
    });
  }
  // `ask`: whether entries at another site ask first (the event's open, or a pin was dropped for it).
  function moveTo(slug: string, partId: string | null, ask = started) {
    if (ask && siteSlug && slug !== siteSlug && eventUnsaved && !pendingSite) return setPendingSite({ slug, partId });
    setPendingSite(null);
    setAreaAt(null);
    // A new site given a known site after all: it's a new location there now, and which kind is a choice again.
    if (slug && !siteSlug) setSpotInfo((i) => (i.decided ? { ...i, decided: false } : i));
    setPicked({ slug, partId });
    dispatch({ type: "showChoice", wide });
  }

  // What the form holds (see MapEventForm's onEntries): with `eventUnsaved` below, what leaving would lose.
  const [entry, setEntry] = useState<FormEntries>({ entered: false, saved: false, partly: false, saving: false });
  // A past season's Edit, in the panel's header when it has one; otherwise phones keep Search there.
  const [headerAction, setHeaderAction] = useState<HTMLElement | null>(null);
  const [seasonButton, setSeasonButton] = useState(false);
  function openSeason(x: { slug: string; label: string }, wholeSite: boolean) {
    wholeSiteFor(wholeSite);
    dispatch({ type: "openSeason", season: { slug: x.slug, label: x.label, wholeSite }, wide });
  }
  // Listed for the whole site (the part had none): it's the whole site that's shown, so the whole site is chosen.
  function wholeSiteFor(wholeSite: boolean) {
    if (wholeSite && part) {
      setPart(null);
      setPicked({ slug: siteSlug, partId: null });
    }
  }
  const closeSeason = () => dispatch({ type: "closeSeason" });
  const [formKey, setFormKey] = useState(0);

  // The area brought forward: the map fits it and darkens the rest.
  const [shownArea, setShownArea] = useState<number | null>(null);
  const map = usePlantingMap({ pins, initialSite, container: mapEl, pinClass: s.pin ?? "", wideQuery: WIDE, onPick: pickPin, onTap: tapMap });
  const { findMe, said } = useFindMe(map);

  function pickPin(pin: SitePin) {
    // The pin already chosen: as choosing its part again (the map goes there), and an open season stays.
    if (pin.slug === siteSlug && pin.partId === part) {
      choosePart(pin.partId);
      if (!wide) setSnap("mid");
      return;
    }
    unlessEditing(() => goToPin(pin));
  }
  function goToPin(pin: SitePin) {
    if (started && entry.saved) return leaveFor(pin);
    // Another site's pin, with an event's entries here: mid-event it's the same question as the list's
    // (the entries move with it); otherwise (or saved without its plants) leaving clears them, so it asks.
    if (siteSlug && pin.slug !== siteSlug && eventUnsaved) {
      if (started && !entry.partly) return setPendingSite({ slug: pin.slug, partId: pin.partId });
      return setLeaving({ to: pin.label, run: () => leaveFor(pin) });
    }
    dispatch({ type: "endModes", snap: "mid" });
    setAreaAt(null);
    setPicked({ slug: pin.slug, partId: pin.partId });
  }

  // Looking at a site (before starting an event), a tap on the map away from its pin goes back to every site.
  function tapMap(at: { x: number; y: number }) {
    // Not with areas drawn: a tap beside one is about the area (see tapArea), not leaving the site.
    if (started || !siteSlug || draw.draft || draw.areas.length || placing || !map.current) return;
    const pin = pinAt(siteSlug, part);
    const p = pin && map.current.project(pin);
    if (p && Math.hypot(p.x - at.x, p.y - at.y) < AWAY_PX) return;
    unlessUnsaved("every site", () => (eventUnsaved ? leaveFor("all") : setPicked({ slug: "", partId: null })));
  }

  // The new location dropped with the cross (see use-cross.ts). Not saved yet.
  const [spot, setSpot] = useState<LngLat | null>(null);
  // The pin nearest the new location: within NEAR_KM it fills in the site (and part); further, the form asks.
  const [spotNear, setSpotNear] = useState<SpotNear | null>(null);
  const [spotInfo, setSpotInfo] = useState<SpotInfo>({ name: "", asPart: false });
  // Where the last kept area is, so the camera stays on it when the site changes to match.
  const [areaAt, setAreaAt] = useState<LngLat | null>(null);
  // An area drawn at another site than the event's: asked about before it's kept (the draft stays open).
  const [areaElsewhere, setAreaElsewhere] = useState<{ pin: SitePin; at: LngLat } | null>(null);
  // Drawn from the plant list (its Draw area), so keeping it goes back to the list.
  const fromList = useRef(false);
  // An area near another site than the event's asks first (an event is at one site); otherwise the first area sets the site.
  const keepArea: OnKeep = (pts, others) => {
    const at = boundsOf(pts).getCenter().toArray() as LngLat;
    const near = nearestPin(pins, at);
    const pin = near && near.km <= NEAR_KM ? near.pin : null;
    const drawnFromList = fromList.current; // cleared once the drawing ends (below), so Keep drawing keeps it
    // Only asked with something to lose: an event under way, or other areas here. Otherwise the area takes its site.
    if (pin && siteSlug && pin.slug !== siteSlug && (started || others > 0)) {
      setAreaElsewhere({ pin, at });
      return false;
    }
    setAreaAt(at);
    setFocus(at);
    dispatch({ type: "keepArea", wide, full: !wide && drawnFromList, list: !pin && !siteSlug });
    if (pin && others === 0) setPicked({ slug: pin.slug, partId: pin.partId });
    return true;
  };
  // A tap on a kept area brings it forward (a second tap opens its sheet); elsewhere, lets it go.
  function tapArea(id: number | null) {
    if (placing) return; // the cross is up: the map is for placing it
    if (id !== null && id === shownArea) return dispatch({ type: "openArea", id, wide });
    closeSheet();
    setShownArea(id);
  }
  const draw = useDrawArea(map, keepArea, tapArea);
  // Drawn from the plant list: only for this drawing, kept or stopped.
  const drafting = !!draw.draft;
  useEffect(() => { if (!drafting) fromList.current = false; }, [drafting]);
  const [areaPlants, setAreaPlants] = useState<Record<number, number>>({});
  function removeSpot() {
    setSpot(null);
    setSpotNear(null);
    setSpotInfo({ name: "", asPart: false });
  }
  // The form's Cancel new location: back to the site and part from before it was dropped. With nothing entered,
  // back to where you were too (its page or season, if the form wasn't open); with entries, the form stays open.
  function cancelSpot() {
    removeSpot();
    const b = page.spotFrom;
    const back = b.slug !== siteSlug || b.part !== part;
    if (back) setPicked({ slug: b.slug, partId: b.part });
    if (!entry.entered && !draw.areas.length) dispatch({ type: "cancelSpot", back });
  }
  /** Everything the map holds for the event: its new location, its areas, and the plant list's ask. */
  function clearEvent() {
    removeSpot();
    draw.clear();
    setPlantIn(null);
    setAreaAt(null);
  }
  // The area at another site starts a new event there: what was entered is cleared, the area kept.
  function newEventForArea() {
    if (!areaElsewhere) return;
    const { pin, at } = areaElsewhere;
    setAreaElsewhere(null);
    dispatch({ type: "newEvent" });
    removeSpot();
    draw.change({ editing: null }); // the kept areas go, so the shape is a new one there
    draw.clearKept();
    setPlantIn(null);
    setFormKey((k) => k + 1);
    setPicked({ slug: pin.slug, partId: pin.partId });
    setAreaAt(at);
    setFocus(at);
    draw.done(true);
  }
  // Phones: the sheet coming up covers the map, so an unfinished drawing holds it down (the pill says
  // what to do), and a closed shape is kept first (unless it's held to ask something; then the sheet stays down).
  function snapTo(to: Snap) {
    if (!wide && to !== "peek" && draw.draft && (!draw.draft.closed || !draw.done())) return;
    setSnap(to);
  }
  // `kept`: a location just kept to go to instead (see keepSpot).
  function leaveFor(to: { slug: string; partId: string | null } | "all", kept?: { slug: string; partId: string | null } | null) {
    dispatch({ type: "leave" });
    setLeaving(null);
    setPendingSite(null);
    clearEvent();
    setFormKey((k) => k + 1);
    setPicked(kept ?? (to === "all" ? { slug: "", partId: null } : { slug: to.slug, partId: to.partId }));
  }
  // Unsaved work: a new event's entries (species, a note, drawn areas, a dropped location) until they're saved,
  // and a drawing under way. Leaving them asks first.
  const eventUnsaved = !entry.saved && (entry.entered || draw.areas.length > 0 || !!spot);
  // A drawing counts once something's been drawn (a fresh, empty one has nothing to lose).
  const guarded = eventUnsaved || (!!draw.draft && draw.canUndo);
  // The same, not counting a dropped location (it can be kept): what leaving one asks about.
  const entriesUnsaved = (!entry.saved && (entry.entered || draw.areas.length > 0)) || (!!draw.draft && draw.canUndo);
  const { leaving, setLeaving, discard, setDiscard, discardEdit, editTried, seasonKey, onEditDirty, onEditSaving, unlessEditing, unlessUnsaved, exit, depth, popped } = useLeaveGuard({
    guarded, saving: entry.saving, exitHref,
    // Every way a season closes (Back, leaving the site, another part, starting something else) clears `season`.
    seasonOpen: !!season || (started && !!startedFrom),
    formFromSeason: !season && started && !!startedFrom,
    formBack, closeSeason,
  });
  useAddressSync({ siteSlug, part, unsavedSite: site?.unsaved, keptPart, season, depth, popped, totals });
  // Back to every site. A new location with nothing entered is kept, as on the way to its site's page (see showSite).
  function leaveSite() {
    if (spot && !entriesUnsaved) {
      keepSpot();
      return leaveFor("all");
    }
    unlessUnsaved("every site", () => leaveFor("all"));
  }
  // The panel's Back: one step up (the site list, an area's sheet, a season, the form, a part, the site), and off
  // the map only from every site. Each step asks first where it would lose work, as its own way out does.
  function goBack() {
    if (choosing) return closeChooser(true);
    if (sheetArea) return closeSheet();
    if (season) return unlessEditing(closeSeason);
    if (spot) return entriesUnsaved ? leaveSite() : cancelSpot();
    if (started) return void formBack();
    if (site && part) return showSite();
    if (!allSites) return leaveSite();
    exit();
  }
  // The form's Back: where the form was started, the past season or the site's overview (entries kept). True when the season opened again.
  function formBack() {
    const back = !!startedFrom && startedFrom.site === siteSlug && startedFrom.part === part;
    if (back) wholeSiteFor(startedFrom.season.wholeSite);
    dispatch({ type: "formBack", season: back ? startedFrom.season : null, wide });
    return back;
  }
  // After a save, the map's Draw area and New location start the next event: the saved one's areas and form go first.
  function afterSave() {
    if (!entry.saved) return;
    clearEvent();
    setFormKey((k) => k + 1);
    setPicked(null);
    dispatch({ type: "afterSave" });
  }
  const finish = { label: site ? `Back to ${part && partShort ? partShort : site.name}` : "Back to all sites", onClick: () => leaveFor(site ? { slug: siteSlug, partId: part } : "all") };
  const hint = started ? "New planting event" : part && partShort ? partShort : undefined;
  // What the header, the title and the mini map call this site or location. While a new location is being
  // added, that's what it is: never just the site's name, so it can't be mistaken for the site itself.
  const spotTitle = spotInfo.name.trim() || (site ? "New location" : "New site");
  const where = spot
    ? { title: spotTitle, sub: site ? spotKind(spotInfo.asPart, site.name) : "Not saved yet" }
    : { title: siteName, sub: partShort ?? (draw.areas.length ? "Your area needs a site" : undefined) };
  // Before an event is started: the chosen site's overview, or with none, the site chooser (All sites).
  const overview = !started && !spot;
  const allSites = overview && !siteSlug;
  const siteHeader = overview && !!siteSlug && !choosing;
  // The area whose sheet is open (a second tap on it on the map), while nothing else takes the panel.
  const sheetArea = areaSheet !== null && !draw.draft ? draw.areas.find((a) => a.id === areaSheet) : undefined;
  // What the panel shows, and how deep it sits, for its slide: the site list (the level of every site) 0,
  // a site's page 1, a season or the form 2 (the form from a season 3), an area's sheet over them 4.
  const panelScreen = sheetArea ? "area" : choosing || allSites ? "list" : season ? `season:${season.slug}` : overview ? `site:${siteSlug}:${part ?? ""}` : "form";
  const panelDepth = ({ area: 4, list: 0, form: startedFrom ? 3 : 2 } as Record<string, number>)[panelScreen] ?? (season ? 2 : 1);
  const { startCross, cancelCross, dropPinHere, crossDistance, pendingMove, setPendingMove, movePin, movedBy } = useCross({
    map, cross: top?.kind === "placing" ? top : undefined, dispatch, wide, unlessEditing, afterSave, stopDraw: () => draw.stop(),
    siteSlug, part, atSite: !!site, sites, pins, pinAt, pinsOf, move, setFocus,
    spot, setSpot, setSpotNear, setSpotInfo, setPicked, moveTo, nearKm: NEAR_KM,
  });
  const startPlacing = () => startCross("new");
  // The site list's Create a new site: the pin is a new site even beside a known one.
  const startNewSite = () => startCross("site");
  // The form's Move pin: only the new location moves, still what it was.
  const moveSpot = () => startCross("spot");
  const startMoving = () => startCross("move");
  // From the plant list (`list`), keeping the area goes back there.
  const newArea = () => beginArea(false);
  function beginArea(list: boolean) {
    unlessEditing(() => {
      afterSave();
      dispatch({ type: "endModes", snap: "peek" });
      fromList.current = list;
      setShownArea(null); // a new shape, not the one brought forward
      draw.start();
    });
  }
  // Stop: nothing kept. Drawn from the plant list, back to it (phones).
  function stopDrawing() {
    draw.stop();
    if (fromList.current && !wide) setSnap("full");
  }
  function undoMove() {
    move(siteSlug, part, null);
    setFocus(pinFor(allPins, siteSlug, part));
  }
  const showMap = () => setSnap("peek");
  const parts = site ? site.parts.map((p) => ({ id: p.id, name: partBesideSite(p.name, site.name), unsaved: p.unsaved })) : [];
  // The site page's places: a kept one says so, and how far it is from the site's own pins.
  const places = parts.map((p) => {
    if (!p.unsaved || !site) return p;
    const at = pinAt(siteSlug, p.id);
    const km = at && kmToNearest(pins.filter((x) => x.slug === siteSlug && x.partId !== p.id).map((x) => x.at), at);
    return { ...p, sub: km == null ? "Not saved yet" : `Not saved yet · ${fromPin(km, site.name)}` };
  });
  // New sublocation, where New location is offered: not once areas are drawn (or one's being drawn), nor for a new
  // location, nor once the event's saved without its plants (its place can't change).
  const addPart = draw.areas.length || draw.draft || spot || entry.partly || !site ? undefined : () => addSublocation(site.slug);
  // New location: not with areas drawn, and not with one already dropped (its Move pin moves it).
  const addLocation = draw.areas.length || spot || entry.partly ? undefined : startPlacing;
  // The phone title's and the breadcrumb's part menus: not for a new location, while the cross is up, or when the place can't change.
  const placeFixed = !!spot || !!placing || entry.partly;
  const forNew = spot ? { what: "location" as const, atSite: !!siteSlug } : !siteSlug && draw.areas.length > 0 ? { what: "area" as const, atSite: false } : undefined;
  // The map goes to the part's pin (or a new location), even when it's the part already chosen:
  // a new array each time, so the camera moves again.
  function choosePart(id: string | null) {
    if (id !== part && started && entry.saved) return leaveFor({ slug: siteSlug, partId: id });
    if (id !== part) return unlessEditing(() => goToPart(id));
    goToPart(id);
  }
  function goToPart(id: string | null) {
    dispatch({ type: "closeOver" });
    setAreaAt(null);
    setPicked({ slug: siteSlug, partId: id });
    const at = spot ?? pinAt(siteSlug, id);
    if (at) setFocus([at[0], at[1]]);
  }
  // All sites: a site opened in the list flies the map there and lights its pin (nothing chosen yet);
  // closed again, the map goes back out to every site. Choosing one of its rows opens its page.
  function previewSite(slug: string) {
    highlightSite(map, slug);
    const at = slug ? pinAt(slug, null) : null;
    setFocus(at ? [at[0], at[1]] : null);
  }
  // With a new location in progress, its site's page: the location is kept (see KeptPlace); with entries, it asks first.
  function showSite() {
    if (spot && siteSlug) {
      const go = () => leaveFor({ slug: siteSlug, partId: null }, keepSpot());
      return entriesUnsaved ? setLeaving({ to: siteName, run: go }) : go();
    }
    unlessEditing(() => {
      dispatch({ type: "showSite", wide });
      goToPart(null);
    });
  }
  // Keeps the dropped location for this visit: a part of its site, or a new site of its own (once: again, the same
  // place). Where it is now. Also after a planting event is saved there, and on Start another.
  const keptSpot = useRef<{ at: string; place: { slug: string; partId: string | null } } | null>(null);
  function keepSpot() {
    if (!spot) return null;
    if (keptSpot.current?.at === `${spot[0]},${spot[1]}`) return keptSpot.current.place;
    const n = kept.length + 1;
    const place: KeptPlace = site
      ? { site: siteSlug, id: `kept-${n}`, name: spotTitle, label: `${site.name} · ${spotTitle}`, at: spot }
      : { site: `kept-site-${n}`, id: null, name: spotTitle, label: spotTitle, at: spot };
    setKept((k) => [...k, place]);
    keptSpot.current = { at: `${spot[0]},${spot[1]}`, place: { slug: place.site, partId: place.id } };
    return keptSpot.current.place;
  }
  // A kept part isn't stored: the planting is saved at its site as a whole (the receipt says the location isn't).
  const saveAtKnownPlace: NonNullable<MapEventFormProps["onSave"]> = (input, id) => {
    const unsaved = sites.find((x) => x.slug === input.siteSlug)?.parts.find((p) => p.id === input.partId)?.unsaved;
    return onSave!({ ...input, partId: unsaved ? null : input.partId }, id);
  };
  function letGo() {
    setShownArea(null);
    closeSheet();
  }
  useMapKeys({
    on: wide, areas: draw.areas, shown: shownArea, drawing: !!draw.draft || !!placing,
    onDraw: newArea, onStop: () => (placing ? cancelCross() : stopDrawing()), onShow: showArea, onLetGo: letGo,
  });

  // The cross sits where the map's centre is: the middle of the padding the form leaves.
  const pad = paddingFor(wide, snap, screen?.clientHeight ?? 0);
  const cross = screen && {
    left: pad.left + (screen.clientWidth - pad.left - pad.right) / 2,
    top: pad.top + (screen.clientHeight - pad.top - pad.bottom) / 2,
  };
  useSpotMarker(map, spot, NEW_PIN_CLASS);
  useCamera(map, wide, snap, focus, pins);
  const shownPts = draw.areas.find((a) => a.id === shownArea)?.pts;
  useEffect(() => {
    if (shownPts && map.current) fitArea(map.current, shownPts);
  }, [map, shownPts]);
  // An area's Add plants in the bar: the form's "What was planted", on that area (the phone sheet goes full screen for it).
  // From an area's sheet, the site as a whole instead: the same list, for plants in no area.
  const [plantIn, setPlantIn] = useState<{ id: AreaPick } | null>(null);
  // The plant list brings forward the area being filled in, and lets it go on leaving. Done on a list opened
  // from the map comes back to that area (its stepper, or its row), not to nothing: you were working on it.
  const lastPlanted = useRef<number | null>(null);
  const backTo = useRef<number | null>(null);
  const focusArea = useCallback((id: number | null) => {
    if (id !== null) lastPlanted.current = id;
    setShownArea(id ?? backTo.current);
    if (id === null) backTo.current = null;
  }, [setShownArea]);
  // Not once the event's saved: its plants are in.
  const plantIfOpen = entry.saved ? undefined : plantArea;
  function plantArea(id: AreaPick) {
    unlessEditing(() => {
      dispatch({ type: "plantArea" });
      setPlantIn({ id });
    });
  }
  // Goes there even if it was already forward: the map may have moved.
  function showArea(id: number) {
    closeSheet();
    setShownArea(id);
    const pts = draw.areas.find((a) => a.id === id)?.pts;
    if (pts && map.current) fitArea(map.current, pts);
  }
  // An area tapped in the form's list. Phones: lower the sheet first, and go there once the map has moved for it;
  // with the sheet still half up there's too little map left to fit the area, and the map zooms right out.
  function showAreaFromForm(id: number) {
    if (wide || snap === "peek") return showArea(id);
    setSnap("peek");
    map.current?.once("moveend", () => showArea(id));
  }

  const onSiteChange = useCallback((slug: string, partId: string | null) => {
    // The form says its site when it starts too: a season opened from the address stays open.
    dispatch({ type: "placeChanged", slug, part: partId, changed: slug !== siteSlug || partId !== part });
    setSiteSlug(slug);
    setPart(partId);
    highlightSite(map, slug);
    // A new location, or a kept area just drawn, stays in view; otherwise the site's (part's) pin.
    setFocus(spot ?? areaAt ?? pinAt(slug, partId));
  }, [map, spot, areaAt, pinAt, setSiteSlug, setPart, setFocus, siteSlug, part, dispatch]);

  // The plant list needs the room: phones take the sheet full screen once it's in use.
  const onListFocus = () => { if (!wide) setSnap("full"); };

  // A mini map at the top of the site's page and of the form: always on desktop (a slim strip), and on phones when the
  // sheet is full screen. A chosen site is named by the page's own header, so the map leaves its label off.
  const miniMap = focus && (wide || snap === "full")
    ? <MiniMap at={focus} areas={draw.areas.map((a) => a.pts)} label={where.title} sub={where.sub} isNew={!!spot} onOpen={wide ? undefined : showMap} noCaption={!!site && !spot} compact={wide} />
    : undefined;

  return (
    <div ref={setScreen} className={s.screen} data-full-screen="" data-drawing={draw.draft || placing ? "" : undefined}>
      <div ref={mapEl} className={s.map} />
      <PinTooltip map={mapEl} />
      {/* Phones: a see-through green band behind the header; Safari tints its top bar from it. */}
      <div className={s.topBand} aria-hidden="true" />
      <AreaOverlay map={map} draw={draw} shown={shownArea} />
      <TopBar siteName={spot || site ? where.title : undefined} hint={hint} choosing={choosing} onChooseSite={toggleChooser} onAddLocation={addLocation} onDrawArea={newArea} onFindMe={findMe} />
      {wide && (
        <MapTools
          map={map} drawing={!!draw.draft || !!placing} onDraw={newArea} onAddLocation={addLocation}
          areas={draw.areas.length} shown={draw.areas.findIndex((a) => a.id === shownArea)} onLetGo={letGo}
          // From none brought forward, next is the first and previous the last.
          onStep={(by) => { const n = draw.areas.length, i = draw.areas.findIndex((a) => a.id === shownArea); const a = draw.areas[i < 0 ? (by > 0 ? 0 : n - 1) : (i + by + n) % n]; if (a) showArea(a.id); }}
        />
      )}
      {/* Phones' Find me (the + menu): a short word when it can't, where the placing hint goes. */}
      {said && !placing && <p className={s.hint} role="status">{said}</p>}
      {placing ? (
        <>
          {cross && <span className={s.cross} style={cross} aria-hidden="true" />}
          {/* On phones, just above the sheet while it's at its bar; under the header once it's pulled up. */}
          <p className={s.hint} role="status" style={!wide && snap === "peek" ? { top: "auto", bottom: SHEET_HEIGHT.peek + 12 } : undefined}>
            {placing === "move" ? `Line the cross up with ${part && partShort ? partShort : "the site"}` : "Move the map to the spot"}{crossDistance}
            <button type="button" className={s.hintCancel} onClick={cancelCross}>Cancel</button>
            <button type="button" className={s.hintMain} onClick={dropPinHere}>Drop pin here</button>
          </p>
        </>
      ) : (wide || snap === "peek") && (
        // Phones: just above the sheet at its bar. Pulled up, the sheet covers the map, so no bar.
        <DrawBar
          draw={draw} onAdd={newArea} onStop={stopDrawing} onShow={showArea} onClose={letGo} onPlant={plantIfOpen} plants={areaPlants} shown={shownArea}
          siteName={site?.name} partName={part ? partShort : undefined} part={part} parts={parts}
          onChoosePart={choosePart} onChangeSite={changeSite} onAllSites={leaveSite} onAddPart={addPart} placeLocked={entry.partly || !!spot} onSite={spot && site ? showSite : undefined} choosing={choosing} onToggleSite={toggleChooser} dock={!wide}
          style={wide ? undefined : { bottom: SHEET_HEIGHT.peek + 12 }}
        />
      )}
      <FormPanel
        wide={wide} open container={screen} snap={snap} onSnap={snapTo} label={started ? "New planting event" : "Planting map"} locked={!!draw.draft || !!placing}
        title={sheetArea ? sheetArea.name || "Planted area" : where.title}
        subtitle={sheetArea ? (site ? `Planted area at ${siteName}` : "Planted area")
          : siteHeader ? [season?.wholeSite ? "Whole site" : partShort, season?.label].filter(Boolean).join(" · ") : where.sub}
        screen={panelScreen} depth={panelDepth}
        actionSlot={season && seasonButton && !choosing && !sheetArea ? setHeaderAction : undefined}
        onTitle={wide || draw.draft || placing || sheetArea ? undefined : toggleChooser} titleOpen={choosing} titleIcon={allSites || siteHeader}
        titleMenu={!wide && site && !placeFixed && !sheetArea && !draw.draft && !choosing ? (b) => (
          <PartMenu
            siteName={site.name} parts={parts} part={part} onChoosePart={choosePart} side="bottom"
            onAddPart={addPart} onAllSites={leaveSite} className={b.className} label={b.label}
          >
            {b.children}
          </PartMenu>
        ) : undefined}
        onSearch={wide || draw.draft ? undefined : searchSites}
        // Not while drawing or placing (they have their own Cancel), nor on wide at every site (nothing in the page above it).
        onBack={draw.draft || placing || (wide && allSites && !choosing && !season && !sheetArea) ? undefined : goBack}
        backLabel={allSites && !choosing && !season && !sheetArea ? "Leave the map" : "Back"}
        // Wide: the breadcrumb names the site and part, so in the form the title only shows when it's something else
        // (an area, a new location). With no site, and on a site's overview, it heads the panel as on phones.
        titleHidden={!!site && !sheetArea && !spot && !allSites && !siteHeader}
        above={
          <Crumbs
            siteName={site?.name} parts={parts} part={part} partName={part ? partShort : undefined}
            onAllSites={leaveSite} onSite={showSite} onChoosePart={choosePart} onOtherSite={changeSite} onAddPart={addPart}
            partsLocked={placeFixed || !!draw.draft} locked={!!draw.draft || !!placing} bare={!site && !allSites}
          />
        }
        below={
          <AreaList
            areas={draw.areas} shown={shownArea} plants={areaPlants} notStarted={!started} drawing={!!draw.draft || !!placing}
            onShow={showArea} onReshape={(i) => draw.start(i)} onPlant={plantIfOpen} onDraw={newArea}
          />
        }
      >
        {sheetArea && (
          <AreaSheet
            area={sheetArea} plants={areaPlants[sheetArea.id] ?? 0}
            onPlant={entry.saved ? undefined : () => plantArea(sheetArea.id)}
            onWholeSite={entry.saved ? undefined : () => plantArea(WHOLE_SITE_KEY)} onClose={closeSheet}
          />
        )}
        {/* Hidden, not closed, under the site list or an area's sheet: closing those comes back to an edit as it was. */}
        {season && siteSlug && (
          <PastSeason
            key={`season-${seasonKey}`} slug={siteSlug} partId={season.wholeSite ? null : part} season={season} today={today} onSaveEdit={onSaveEdit} species={options.species}
            actionSlot={headerAction} onHeaderButton={setSeasonButton} onDirty={onEditDirty} onSaving={onEditSaving} hidden={choosing || !!sheetArea}
            onBack={closeSeason} startLabel={eventUnsaved ? "Back to your planting event" : undefined} onStart={() => { afterSave(); dispatch({ type: "startForm", from: { season, site: siteSlug, part } }); }}
          />
        )}
        {(choosing || (allSites && !season && !sheetArea)) && (
          <SiteChooser
            // With no site there's nothing behind it to close back to.
            sites={sites} totals={totals} value={{ slug: siteSlug, partId: part }} onChoose={chooseSite} onClose={allSites ? undefined : () => closeChooser(true)}
            forNew={forNew}
            onKeepNew={() => {
              // A new site after all: the nearest known pin again (it may have moved), and with entries at a site, asked first.
              const near = spot && nearestPin(pins, spot);
              setSpotNear(near ? { label: near.pin.label, km: near.km, matched: false } : null);
              setSpotInfo((i) => ({ ...i, asPart: false, decided: true }));
              moveTo("", null, true);
            }}
            onAddSublocation={forNew || draw.areas.length || draw.draft || entry.partly ? undefined : addSublocation} searchAsk={searchAsk}
            onNewSite={draw.areas.length || draw.draft || entry.partly ? undefined : startNewSite}
            onPreview={allSites ? previewSite : undefined}
          />
        )}
        {overview && siteSlug && !choosing && !sheetArea && !season && (
          <SiteOverview
            slug={siteSlug} partId={part} partName={part ? partName : undefined} today={today} totals={totals} map={miniMap}
            places={part ? undefined : places} onPlace={choosePart}
            // With an event's entries kept (after its Back), the button goes back to it.
            onStart={() => { afterSave(); dispatch({ type: "startForm", from: null }); }} startLabel={eventUnsaved ? "Back to your planting event" : undefined} onOpenSeason={openSeason} pinMoved={isMoved(siteSlug, part)} onMovePin={draw.draft ? undefined : startMoving} onUndoPin={undoMove} />
        )}
        <MapEventForm
          key={`form-${formKey}`} hidden={overview || choosing || !!sheetArea || !!season} options={formOptions} // A site that isn't stored (a new one, or kept from earlier) can't be saved to yet: the receipt says "Not saved".
          onSave={onSave && site && !site.unsaved ? saveAtKnownPlace : undefined}
          onKeepLocation={() => leaveFor("all", keepSpot())} onSavedAtSpot={keepSpot} today={today} picked={picked}
          // A fresh form starts where the page is, not where it first opened.
          initialSite={siteSlug} initialPart={part} onEntries={setEntry} onChooseSite={changeSite}
          placeMenu={site && !spot ? (b) => (
            <PartMenu
              siteName={site.name} parts={parts} part={part} onChoosePart={choosePart} side="bottom"
              onAddPart={addPart} onOtherSite={changeSite} className={b.className} label={b.label}
            >
              {b.children}
            </PartMenu>
          ) : undefined}
          suggestions={suggestions[siteSlug] ?? []} onListFocus={onListFocus} onSiteChange={onSiteChange}
          spot={spot} spotNear={spotNear} nearKm={NEAR_KM}
          spotKm={spot && site ? kmToNearest(pinsOf(siteSlug), spot) : null}
          // Drawn areas far from the event's site: the furthest one's distance (a quiet note, as for a location).
          areaKm={site && draw.areas.length ? Math.max(...draw.areas.map((a) => kmToNearest(pinsOf(siteSlug), boundsOf(a.pts).getCenter().toArray() as LngLat) ?? 0)) : null} onAddSpot={draw.draft ? undefined : moveSpot} onRemoveSpot={cancelSpot} spotInfo={spotInfo} onSpotInfo={setSpotInfo}
          onFinish={finish}
          pinMoved={isMoved(siteSlug, part)}
          areas={draw.areas} areasListed={wide} plantIn={plantIn} onDrawArea={draw.draft ? undefined : () => beginArea(true)} onShowArea={showAreaFromForm} onPlantClose={() => { backTo.current = lastPlanted.current; if (!wide) setSnap("peek"); }} onAreaPlants={setAreaPlants} onAreaFocus={focusArea} onReset={() => { keepSpot(); clearEvent(); if (!wide) setSnap("mid"); }}
          plantedArea={miniMap}
        />
      </FormPanel>
      <LeaveDialogs
        siteName={siteName} partShort={partShort} part={part} areas={draw.areas.length}
        pinMove={!!pendingMove} movedBy={movedBy} onMovePin={() => pendingMove && movePin(pendingMove)} onKeepPin={() => setPendingMove(null)}
        areaElsewhere={!!areaElsewhere} areaSite={areaElsewhere?.pin.label} onNewEventThere={newEventForArea} onKeepDrawing={() => setAreaElsewhere(null)}
        pendingSite={!!pendingSite} pendingSiteName={sites.find((x) => x.slug === pendingSite?.slug)?.name ?? "another site"}
        onMoveEvent={() => { const p = pendingSite; if (!p) return; setPendingSite(null); if (p.run) p.run(); else moveTo(p.slug, p.partId, false); }}
        onKeepSite={() => { setPendingSite(null); if (choosing) closeChooser(true); }}
        discard={!!discard} editTried={editTried} onDiscard={discardEdit} onKeepEditing={() => setDiscard(null)}
        leaving={!!leaving} leavingTo={leaving?.to} eventUnsaved={eventUnsaved} partly={entry.partly}
        onLeave={() => { const run = leaving?.run; setLeaving(null); draw.stop(); run?.(); }} onStay={() => setLeaving(null)}
      />
    </div>
  );
}
