"use client";
/**
 * The planting event page: a full-screen satellite map with a pin for every site,
 * and the planting-event form over it (on the left on wide screens, in a
 * bottom drawer on phones). Clicking a pin chooses that site in the form;
 * choosing a site in the form highlights its pin and flies there.
 *
 * This file only wires the parts together:
 *   layout.ts           the map padding the form leaves
 *   sites.ts            the pins, from data/site-locations.json
 *   map-scene.ts        MapLibre: the map and the pins
 *   use-planting-map.ts starting the map, and keeping the chosen site in view
 *   use-pin-moves.ts    site pins moved because they were in the wrong spot
 *   top-bar             back, the site, and the + menu
 *   site-chooser        every site and its parts, with a search: the panel with no site chosen, or opened to change site
 *   site-overview       before the form: what a chosen site has had planted
 *   past-season         one past season's planting events at the site, opened from a season's row
 *   draw-area/          drawing planted areas, and the bar along the bottom of the map
 *   navigator/          wide screens: the panel's breadcrumb and area list, the map's toolbar and keys
 *   part-menu           the site's parts in a menu (the phone dock and site page, the wide breadcrumb)
 *   use-keyboard-fit.ts phones: the screen shrinks above the keyboard
 * Shared pieces: FormPanel (the form's panel), MiniMap and FigureList (components/wrt/shared).
 */
import type { Route } from "next";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { MapEventForm, WHOLE_SITE_KEY, type AreaPick, type FormEntries, type MapEventFormProps, type PlantTotals, type SpotInfo } from "@/components/wrt/events/map-event-form";
import type { EventFormOptions } from "@/lib/wrt/events/form-options";
import type { SpeciesSuggestion } from "@/lib/wrt/events/site-suggestions";
import { fromPin, kmLabel, partBesideSite, spotKind } from "@/lib/wrt/text";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormPanel, SHEET_HEIGHT, type Snap } from "@/components/wrt/shared/form-panel";
import { MiniMap, NEW_PIN_CLASS } from "@/components/wrt/shared/mini-map";
import { paddingFor } from "./layout";
import { keptPin, kmBetween, kmToNearest, nearestPin, pinFor, sitePins, withKept, type KeptPlace, type LngLat, type SitePin } from "./sites";
import { PartMenu } from "./part-menu";
import { SiteOverview } from "./site-overview";
import { PastSeason } from "./past-season";
import { PinTooltip } from "./pin-tooltip";
import { SiteChooser } from "./site-chooser";
import { TopBar } from "./top-bar";
import { usePinMoves } from "./use-pin-moves";
import { AreaOverlay, AreaSheet, DrawBar, useDrawArea, type OnKeep } from "./draw-area";
import { highlightSite, mapCentre, useCamera, useFindMe, usePlantingMap, useSpotMarker } from "./use-planting-map";
import { boundsOf, fitArea } from "./map-scene";
import { useKeyboardFit } from "./use-keyboard-fit";
import { useHistoryEntries } from "./use-history-entries";
import { AreaList, Crumbs, MapTools, useMapKeys } from "./navigator";
import s from "./create-planting-event.module.css";

const WIDE = "(min-width: 768px)";
/** A new location this close to a site's (or part's) pin counts as that site. */
const NEAR_KM = 1.5;
/** The status bar's colour: over the map, and under the full-screen drawer. */
const HEADER_GREEN = "#15261c";
/** A tap on the map at least this far (px) from the chosen site's pin leaves the site. */
const AWAY_PX = 120;

export interface CreatePlantingEventProps {
  /** Site slug to start at, or "" to start with every site in view. */
  initialSite: string;
  /** A part of the initial site to start at (its id, the WRT number), or none for the site as a whole. */
  initialPart?: string | undefined;
  /** A past season to start with open, at the initial site (the initial part's, or with none the whole site's). */
  initialSeason?: { slug: string; label: string } | undefined;
  options: EventFormOptions;
  /** NZ today, "YYYY-MM-DD". */
  today: string;
  /** Where the back arrow goes. */
  exitHref: Route;
  /** Each site's most planted species, by site slug, for the plant list. */
  suggestions: Record<string, SpeciesSuggestion[]>;
  /** Plants and species recorded at each site ("slug") and part ("slug/part id"), for the site chooser. */
  totals: PlantTotals;
  /** Every area with its pin, from the areas table. */
  areas: Parameters<typeof sitePins>[1];
  /** Saves the checked event and its plants (the page's server action). */
  onSave?: MapEventFormProps["onSave"];
  /** Lets past planting events be edited from their season's details. */
  canEdit?: boolean | undefined;
}

export function CreatePlantingEvent({ initialSite: siteFromAddress, initialPart, initialSeason, options, today, exitHref, suggestions, totals, areas, onSave, canEdit }: CreatePlantingEventProps) {
  // Where the page opened. Only the first value counts: our address changes make Next's server refreshes (after a
  // save) render with the new address, and a new start site would rebuild the map. (Part and season only seed state.)
  const [initialSite] = useState(siteFromAddress);
  const wide = useMedia(WIDE);
  const mapEl = useRef<HTMLDivElement>(null);
  const [screen, setScreen] = useState<HTMLDivElement | null>(null);
  useKeyboardFit(screen);
  // Phones start with the sheet at its bar, so the map shows first; a season from the address opens full screen, as one opened here does.
  const [snap, setSnap] = useState<Snap>(initialSeason ? "full" : "peek");
  const [basePins] = useState(() => sitePins(options.sites, areas, totals));
  // Locations added on the map this visit (Save location, or a planting event saved at one): in the site list,
  // the menus, the form and on the map, like any other place. See KeptPlace.
  const [kept, setKept] = useState<KeptPlace[]>([]);
  const sites = useMemo(() => withKept(options.sites, kept), [options.sites, kept]);
  const formOptions = useMemo(() => ({ ...options, sites }), [options, sites]);
  const allPins = useMemo(() => [...basePins, ...kept.map(keptPin)], [basePins, kept]);
  const { pins, pinAt, isMoved, move } = usePinMoves(allPins);
  // A site's pins (its own and its places'): distances to a site are to the nearest of them.
  const pinsOf = (slug: string) => pins.filter((p) => p.slug === slug).map((p) => p.at);
  // A pin clicked on the map (a new object each click, so clicking the same pin again still counts);
  // the form takes it up and reports its choice back as `siteSlug`.
  const [picked, setPicked] = useState<{ slug: string; parcelId: string | null } | null>(null);
  const [siteSlug, setSiteSlug] = useState(initialSite);
  const [parcel, setParcel] = useState<string | null>(initialPart ?? null);
  // What the camera centres: the new location if there is one, else the chosen site's (part's) pin.
  const [focus, setFocus] = useState<LngLat | null>(null);
  const site = sites.find((x) => x.slug === siteSlug);
  const siteName = site?.name ?? "Choose a site";
  const partName = site ? site.parts.find((p) => p.id === parcel)?.name ?? "Whole site" : undefined;
  // Beside the site's name, the part without the site in front of it: "Morning Star Reserve", not "Arthurs Point - Morning Star Reserve".
  const partShort = partName && site ? partBesideSite(partName, site.name) : partName;
  const keptPart = !!site?.parts.find((p) => p.id === parcel)?.unsaved;
  // The site title (and the form's "Choose a site") opens the chooser in the panel's place: sites with
  // their parts. On phones the sheet goes full screen for it, and after a choice comes back to at least
  // half way (to show it); closed without one (`back`), it goes back exactly where it was.
  const [choosing, setChoosing] = useState(false);
  const snapBefore = useRef<Snap>("mid");
  function changeSite() {
    setAreaSheet(null);
    setPlacing(false);
    setSearchAsk(0); // only Search focuses the search box
    if (!choosing) snapBefore.current = snap; // already open: keep where it was before
    setChoosing(true);
    if (!wide) setSnap("full");
  }
  function closeChooser(back = false) {
    setChoosing(false);
    setSearchAsk(0);
    if (!wide) setSnap(!back && snapBefore.current === "peek" ? "mid" : snapBefore.current);
  }
  // Phones' Search: the site chooser with its search box focused (each tap asks again).
  const [searchAsk, setSearchAsk] = useState(0);
  function searchSites() {
    if (!choosing && !allSites) changeSite();
    else if (!wide) setSnap("full"); // All sites: the list is the panel, raised for the search
    setSearchAsk((n) => n + 1);
  }
  // A new part of a site: drop a pin on the map as a sublocation of it. An event with entries at another
  // site asks first, as choosing that site does.
  function addSublocation(slug: string) {
    unlessEditing(() => {
      if (started && siteSlug && slug !== siteSlug && eventUnsaved) return setPendingSite({ slug, parcelId: null, run: () => startCross("part", slug) });
      startCross("part", slug);
    });
  }
  // The header pill and the phone panel's title toggle it: a second tap closes.
  // Everything else that asks for a site (a kept area, a dropped pin, Another site, Search) only ever opens it.
  const toggleChooser = () => (choosing ? closeChooser(true) : changeSite());
  // Leaving unsaved work asks first: where it goes (for the dialog), and how.
  const [leaving, setLeaving] = useState<{ to: string; run: () => void } | null>(null);
  // Another site, with an event's entries at this one, asks first: they move with it (drawn areas stay put).
  // `run` is what to do instead of choosing the site (a sublocation's pin there).
  const [pendingSite, setPendingSite] = useState<{ slug: string; parcelId: string | null; run?: () => void } | null>(null);
  function chooseSite(slug: string, parcelId: string | null) {
    if (slug === siteSlug && parcelId === parcel) return moveTo(slug, parcelId);
    // The event is saved: another site or part is a fresh start there, not a change to it.
    if (started && entry.saved) return leaveFor({ slug, parcelId });
    // Saved without its plants: its place can't change, so another one leaves it (asking first).
    if (entry.partly) return setLeaving({ to: sites.find((x) => x.slug === slug)?.name ?? "that site", run: () => leaveFor({ slug, parcelId }) });
    // Another site or part closes an open season: ask first if a past planting there has unsaved changes.
    unlessEditing(() => {
      // Entries kept from an event (after its Back) would go to the other site unseen: leaving clears them, so it asks.
      if (!started && eventUnsaved && slug !== siteSlug) return setLeaving({ to: sites.find((x) => x.slug === slug)?.name ?? "that site", run: () => leaveFor({ slug, parcelId }) });
      moveTo(slug, parcelId);
    });
  }
  // `ask`: whether entries at another site ask first (the event's open, or a pin was dropped for it).
  function moveTo(slug: string, parcelId: string | null, ask = started) {
    if (ask && siteSlug && slug !== siteSlug && eventUnsaved && !pendingSite) return setPendingSite({ slug, parcelId });
    setPendingSite(null);
    setAreaAt(null);
    // A new site given a known site after all: it's a new location there now, and which kind is a choice again.
    if (slug && !siteSlug) setSpotInfo((i) => (i.decided ? { ...i, decided: false } : i));
    setPicked({ slug, parcelId });
    // From the list: back to where it was opened from. Otherwise (a pin, the question) half way, to show the choice.
    if (choosing) closeChooser();
    else if (!wide) setSnap("mid");
  }

  // A tapped site first shows what's been planted there; "Add new planting event" opens the form.
  const [started, setStarted] = useState(false);
  // What the form holds (see MapEventForm's onEntries): with `eventUnsaved` below, what leaving would lose.
  const [entry, setEntry] = useState<FormEntries>({ entered: false, saved: false, partly: false, saving: false });
  // A past season opened from the site's seasons (the overview's or the form's): its planting events take
  // the panel's place until Back. `wholeSite` when the part had none, so the whole site's were listed.
  const [season, setSeason] = useState<{ slug: string; label: string; wholeSite: boolean } | null>(initialSeason ? { ...initialSeason, wholeSite: !initialPart } : null);
  // "Add new planting event" from a past season: the form's Back (and the browser's) opens it again (at the same site and part).
  const [startedFrom, setStartedFrom] = useState<{ season: NonNullable<typeof season>; site: string; parcel: string | null } | null>(null);
  // A past season's Edit, in the panel's header, when it has one to put there (one event, and editing allowed);
  // otherwise phones keep Search there.
  const [headerAction, setHeaderAction] = useState<HTMLElement | null>(null);
  const [seasonButton, setSeasonButton] = useState(false);
  // A past planting being edited with changes not saved yet: anything that would close its season asks first.
  // Saving, the browser's back waits (the save's own dialog is up).
  const editDirty = useRef(false);
  const editSaving = useRef(false);
  const [editing, setEditing] = useState(false);
  // A save of the edit was tried and it's still open: part of it may be saved (Discard says so).
  const [editTried, setEditTried] = useState(false);
  const onEditDirty = useCallback((dirty: boolean) => { editDirty.current = dirty; setEditing(dirty); if (!dirty) setEditTried(false); }, []);
  const onEditSaving = useCallback((saving: boolean) => { editSaving.current = saving; if (saving) setEditTried(true); }, []);
  const [discard, setDiscard] = useState<{ run: () => void } | null>(null);
  // Discard remounts the season, so the editor that had the changes goes too.
  const [seasonKey, setSeasonKey] = useState(0);
  function unlessEditing(run: () => void) {
    if (editDirty.current) setDiscard({ run });
    else run();
  }
  // The browser's back: an open season has its own entry (back closes it, as Back does), and unsaved work
  // a guard entry (back asks first, as the page's ← does). See use-history-entries.ts.
  // Unsaved work now (see `guarded` below), for the browser's back; and leaving agreed to, so the browser doesn't ask again.
  const guardedNow = useRef(false);
  const exiting = useRef(false);
  // The tab had no page before this one: leaving goes to the events page instead of back past it.
  const firstEntry = useRef(false);
  useEffect(() => { firstEntry.current = window.history.length <= 1; }, []);
  // Leaving with the browser's back: if it doesn't get off the page (nothing before it after all), the events page.
  // Not once the page has gone (pagehide: off to another document, or into the back-forward cache).
  const leaveTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    const clear = () => window.clearTimeout(leaveTimer.current);
    window.addEventListener("pagehide", clear);
    return () => { clear(); window.removeEventListener("pagehide", clear); };
  }, []);
  // The form's Back (below), for the browser's back on the form opened from a season.
  const formBackNow = useRef<() => boolean>(() => false);
  const { push: pushEntry, drop: dropEntry, has: hasEntry, home: toPageEntry, depth, popped } = useHistoryEntries((kind, again) => {
    // A new event saving: not now (the entry goes back).
    if (entry.saving) { again.push(kind); return true; }
    if (kind === "season") {
      // The form opened from a season ("Add new planting event"): back is the form's Back, to the season.
      if (!season && started && startedFrom) {
        if (formBackNow.current()) again.push("season");
        return true;
      }
      if (editSaving.current || editDirty.current) {
        again.push("season");
        if (!editSaving.current) setDiscard({ run: () => setSeason(null) });
      } else setSeason(null);
      return true;
    }
    // Over a season's entry (the form opened from it): that one goes first; the guard comes back over it after.
    if (again.has("season")) return false;
    if (!guardedNow.current) return false; // nothing to keep now: on out of the page
    again.push("guard");
    setLeaving({
      to: "the page before",
      run: () => {
        exiting.current = true;
        if (firstEntry.current) return window.location.replace(exitHref);
        again.leave();
        const here = window.location.pathname;
        leaveTimer.current = window.setTimeout(() => {
          if (document.visibilityState === "visible" && window.location.pathname === here) window.location.replace(exitHref);
        }, 600);
      },
    });
    return true;
  });
  // Every way a season closes (Back, leaving the site, another part, starting something else) is setSeason(null):
  // its entry goes with it.
  const seasonOpen = !!season || (started && !!startedFrom);
  useEffect(() => {
    if (!seasonOpen) dropEntry("season");
    else if (!hasEntry("season")) pushEntry("season");
  }, [seasonOpen, dropEntry, hasEntry, pushEntry]);
  // The address follows the site, the part and the open season, so any of them can be bookmarked. A season
  // listed for the whole site (the part had none) is bookmarked without the part, so it opens with its plantings.
  // Plain `{ wrtDepth }` with the URL: Next's replaceState adds its own state and learns the URL. A task later,
  // so Next has patched history by then (on mount this runs first), and only when something differs. Written
  // again after a server refresh (`totals` is new each server render), which rewrites the entry at Next's URL.
  // A timer, not requestAnimationFrame: frames don't run in a background tab, and the address must still follow.
  useEffect(() => {
    const id = setTimeout(() => {
      const d = depth();
      if (d === null) return; // a back is landing: written again once it has (popped)
      const q = new URLSearchParams(window.location.search);
      // Places kept on the map aren't stored, so they aren't bookmarked.
      const part = season?.wholeSite || keptPart ? null : parcel;
      for (const [key, value] of [["site", site?.unsaved ? "" : siteSlug], ["part", part], ["season", season?.slug]] as const) if (value) q.set(key, value); else q.delete(key);
      const url = `${window.location.pathname}${q.size ? `?${q}` : ""}`;
      if (url === `${window.location.pathname}${window.location.search}` && (window.history.state as { wrtDepth?: unknown } | null)?.wrtDepth === d) return;
      // In a background tab, keep Next's state and leave its router alone: a router update there starts a view
      // transition (the layout's ViewTransition), which a hidden document aborts with an error. Told once it shows.
      if (document.hidden) {
        unsynced.current = true;
        return window.history.replaceState({ ...window.history.state, wrtDepth: d }, "", url);
      }
      window.history.replaceState({ wrtDepth: d }, "", url);
    });
    return () => clearTimeout(id);
  }, [siteSlug, parcel, site?.unsaved, keptPart, season?.slug, season?.wholeSite, popped, depth, totals]);
  const unsynced = useRef(false);
  useEffect(() => {
    const show = () => {
      if (document.hidden || !unsynced.current) return;
      unsynced.current = false;
      const { wrtDepth } = (window.history.state ?? {}) as { wrtDepth?: number };
      window.history.replaceState({ wrtDepth }, "", `${window.location.pathname}${window.location.search}`);
    };
    document.addEventListener("visibilitychange", show);
    return () => document.removeEventListener("visibilitychange", show);
  }, []);
  function openSeason(x: { slug: string; label: string }, wholeSite: boolean) {
    endModes();
    // Listed for the whole site (the part had none): it's the whole site that's shown, so the whole site is chosen.
    if (wholeSite && parcel) {
      setParcel(null);
      setPicked({ slug: siteSlug, parcelId: null });
    }
    setSeason({ slug: x.slug, label: x.label, wholeSite });
    if (!wide) setSnap("full");
  }
  const closeSeason = () => setSeason(null);
  const [formKey, setFormKey] = useState(0);

  // The area whose plants are being entered on "What was planted", or tapped on the map or in its bar: the map fits it and darkens the rest.
  const [shownArea, setShownArea] = useState<number | null>(null);
  const map = usePlantingMap({ pins, initialSite, container: mapEl, pinClass: s.pin ?? "", wideQuery: WIDE, onPick: pickPin, onTap: tapMap });
  const { findMe, said } = useFindMe(map);

  // A pin chooses its site (and part, for a part's own pin) and brings the phone sheet up halfway.
  function pickPin(pin: SitePin) {
    // The pin already chosen: as choosing its part again (the map goes there), and an open season stays.
    if (pin.slug === siteSlug && pin.parcelId === parcel) {
      choosePart(pin.parcelId);
      if (!wide) setSnap("mid");
      return;
    }
    unlessEditing(() => goToPin(pin));
  }
  function goToPin(pin: SitePin) {
    // The event is saved: another pin is a fresh start there.
    if (started && entry.saved) return leaveFor(pin);
    // Another site's pin, with an event's entries here: mid-event it's the same question as the list's
    // (the entries move with it); otherwise (or saved without its plants) leaving clears them, so it asks.
    if (siteSlug && pin.slug !== siteSlug && eventUnsaved) {
      if (started && !entry.partly) return setPendingSite({ slug: pin.slug, parcelId: pin.parcelId });
      return setLeaving({ to: pin.label, run: () => leaveFor(pin) });
    }
    endModes();
    setAreaAt(null);
    setPicked({ slug: pin.slug, parcelId: pin.parcelId });
    setSnap("mid");
  }

  // Looking at a site (before starting an event), a tap on the map away from its pin goes back to every site.
  // (Taps on drawn areas are the draw hook's: see onTapArea.)
  function tapMap(at: { x: number; y: number }) {
    // Not with areas drawn: a tap beside one is about the area (see tapArea), not leaving the site.
    if (started || !siteSlug || draw.draft || draw.areas.length || placing || !map.current) return;
    const pin = pinAt(siteSlug, parcel);
    const p = pin && map.current.project(pin);
    if (p && Math.hypot(p.x - at.x, p.y - at.y) < AWAY_PX) return;
    unlessUnsaved("every site", () => (eventUnsaved ? leaveFor("all") : setPicked({ slug: "", parcelId: null })));
  }

  // A new location: a cross sits in the middle of the map you can see (above the phone sheet,
  // beside the desktop panel); move the map under it and place the pin. The nearest site is chosen.
  // "new": dropping a new location. "site": a new site, whatever is near. "part": a sublocation of `partOf`.
  // "spot": moving the new location already dropped. "move": moving the chosen site's pin, which is in the wrong spot.
  const [placing, setPlacing] = useState<false | "new" | "site" | "part" | "spot" | "move">(false);
  const partOf = useRef("");
  // Where you were when the cross came up (Cancel goes back there), and before a new location was dropped (its Cancel).
  const beforeCross = useRef<{ snap: Snap; choosing: boolean; season: typeof season }>({ snap: "mid", choosing: false, season: null });
  const beforeSpot = useRef<{ started: boolean; slug: string; parcel: string | null; season: typeof season }>({ started: false, slug: "", parcel: null, season: null });
  const [spot, setSpot] = useState<LngLat | null>(null);
  // The pin nearest the new location: within NEAR_KM it fills in the site (and part); further, the form asks.
  const [spotNear, setSpotNear] = useState<{ label: string; km: number; matched: boolean } | null>(null);
  // The new location's name, and whether it's a new location near the site or a sublocation of it. Not saved yet.
  const [spotInfo, setSpotInfo] = useState<SpotInfo>({ name: "", asPart: false });
  // Where the last kept area is, so the camera stays on it when the site changes to match.
  const [areaAt, setAreaAt] = useState<LngLat | null>(null);
  // An area drawn at another site than the event's: asked about before it's kept (the draft stays open).
  const [areaElsewhere, setAreaElsewhere] = useState<{ pin: SitePin; at: LngLat } | null>(null);
  // Before an area is kept, where it belongs, by the nearest site's (or part's) pin within NEAR_KM:
  //   one at another site than the event's asks first (an event is at one site), as tapping that site's pin does;
  //   otherwise the first area sets the event's site and part, and later ones keep them;
  //   far from every site, the chooser opens if there's no site yet.
  // The map centres on the area.
  // Drawn from the plant list (its Draw area), so keeping it goes back to the list.
  const fromList = useRef(false);
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
    setStarted(true);
    // Drawn from the plant list's Draw area: back to the list (it opens on the new area), so its plants go in next.
    if (!wide && drawnFromList) setSnap("full");
    if (pin && others === 0) setPicked({ slug: pin.slug, parcelId: pin.parcelId });
    else if (!pin && !siteSlug) changeSite();
    return true;
  };
  // A tap on a kept area brings it forward and goes to it (as its button in the bar does); elsewhere, lets it go.
  // A tap on the one already forward opens its sheet: planting in that area.
  const [areaSheet, setAreaSheet] = useState<number | null>(null);
  function tapArea(id: number | null) {
    if (placing) return; // the cross is up: the map is for placing it
    if (id !== null && id === shownArea) {
      setChoosing(false);
      setAreaSheet(id);
      if (!wide) setSnap("mid");
      return;
    }
    setAreaSheet(null);
    setShownArea(id);
  }
  const draw = useDrawArea(map, keepArea, tapArea);
  // Drawn from the plant list: only for this drawing, kept or stopped.
  const drafting = !!draw.draft;
  useEffect(() => { if (!drafting) fromList.current = false; }, [drafting]);
  // Plants listed in each area (by area id), reported by the form, for the area buttons on the map.
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
    const b = beforeSpot.current;
    if (b.slug !== siteSlug || b.parcel !== parcel) setPicked({ slug: b.slug, parcelId: b.parcel });
    if (entry.entered || draw.areas.length) return;
    setStarted(b.started);
    if (b.season) setSeason(b.season);
  }
  /** Everything the map holds for the event: its new location, its areas, and the plant list's ask. */
  function clearEvent() {
    removeSpot();
    draw.clear();
    setPlantIn(null);
    setAreaAt(null);
  }
  // A fresh form (new key) at the other site, back on its overview.
  // The area at another site starts a new event there: what was entered is cleared, the area kept.
  function newEventForArea() {
    if (!areaElsewhere) return;
    const { pin, at } = areaElsewhere;
    setAreaElsewhere(null);
    setStarted(true);
    setStartedFrom(null);
    removeSpot();
    draw.change({ editing: null }); // the kept areas go, so the shape is a new one there
    draw.clearKept();
    setPlantIn(null);
    setFormKey((k) => k + 1);
    setPicked({ slug: pin.slug, parcelId: pin.parcelId });
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
  function leaveFor(to: { slug: string; parcelId: string | null } | "all", kept?: { slug: string; parcelId: string | null } | null) {
    endModes();
    setSearchAsk(0);
    setLeaving(null);
    setPendingSite(null);
    setStarted(false);
    setStartedFrom(null);
    setSeason(null);
    clearEvent();
    setFormKey((k) => k + 1);
    setPicked(kept ?? (to === "all" ? { slug: "", parcelId: null } : { slug: to.slug, parcelId: to.parcelId }));
    setSnap("mid");
  }
  // Unsaved work: a new event's entries (species, a note, drawn areas, a dropped location) until they're saved,
  // and a drawing under way. Leaving them asks first ("Leave this planting event?"), after a past planting's
  // changes have been asked about ("Discard your changes?").
  const eventUnsaved = !entry.saved && (entry.entered || draw.areas.length > 0 || !!spot);
  // A drawing counts once something's been drawn (a fresh, empty one has nothing to lose).
  const guarded = eventUnsaved || (!!draw.draft && draw.canUndo);
  // The same, not counting a dropped location (it can be kept): what leaving one asks about.
  const entriesUnsaved = (!entry.saved && (entry.entered || draw.areas.length > 0)) || (!!draw.draft && draw.canUndo);
  function unlessUnsaved(to: string, run: () => void) {
    if (entry.saving) return; // mid-save: it finishes first
    unlessEditing(() => (guarded ? setLeaving({ to, run }) : run()));
  }
  useEffect(() => { guardedNow.current = guarded; });
  // Again after each back (`popped`): one that passed a guard on to the season's entry under it puts the guard back.
  useEffect(() => {
    if (!guarded) dropEntry("guard");
    else if (!hasEntry("guard")) pushEntry("guard");
  }, [guarded, popped, dropEntry, hasEntry, pushEntry]);
  // Closing or reloading the tab with unsaved work: the browser asks. Not once leaving was agreed to.
  useEffect(() => {
    if (!guarded && !editing) return;
    const ask = (e: BeforeUnloadEvent) => { if (!exiting.current) e.preventDefault(); };
    window.addEventListener("beforeunload", ask);
    return () => window.removeEventListener("beforeunload", ask);
  }, [guarded, editing]);
  // The top bar's ←, off the map: asks first like the rest.
  // Back to the page's own entry first (past ours), then replace it: back from the events page then goes to the page before this one.
  const exit = () => unlessUnsaved("the events page", () => { exiting.current = true; toPageEntry(() => window.location.replace(exitHref)); });
  // The header's ×: back to every site. Every "All sites" (the breadcrumb's, and the phone title's and dock's menus) does the same.
  // A new location with nothing entered is kept, as on the way to its site's page (see showSite).
  function leaveSite() {
    if (spot && !entriesUnsaved) {
      keepSpot();
      return leaveFor("all");
    }
    unlessUnsaved("every site", () => leaveFor("all"));
  }
  // Starting one thing ends the others: the cross, the site list, an area's sheet and an open season.
  function endModes() {
    setPlacing(false);
    setChoosing(false);
    setAreaSheet(null);
    setSeason(null);
  }
  // The form's Back: where the form was started, the past season or the site's overview (entries kept). True when the season opened again.
  function formBack() {
    setStarted(false);
    setStartedFrom(null);
    const back = !!startedFrom && startedFrom.site === siteSlug && startedFrom.parcel === parcel;
    if (back) openSeason(startedFrom.season, startedFrom.season.wholeSite);
    return back;
  }
  useEffect(() => { formBackNow.current = formBack; });
  // After a save, the map's Draw area and New location start the next event: the saved one's areas and form go first.
  function afterSave() {
    if (!entry.saved) return;
    clearEvent();
    setFormKey((k) => k + 1);
    setPicked(null);
    setStarted(false);
    setStartedFrom(null);
  }
  // After a save, the receipt's way out: the event ends and the site's page shows, with the new planting in its past plantings.
  const finish = { label: site ? `Back to ${parcel && partShort ? partShort : site.name}` : "Back to all sites", onClick: () => leaveFor(site ? { slug: siteSlug, parcelId: parcel } : "all") };
  // Under the site in the header: that an event is being entered, or the part, so the map says where you are.
  const hint = started ? "New planting event" : parcel && partShort ? partShort : undefined;
  // What the header, the title and the mini map call this site or location. While a new location is being
  // added, that's what it is: never just the site's name, so it can't be mistaken for the site itself.
  const spotTitle = spotInfo.name.trim() || (site ? "New location" : "New site");
  const where = spot
    ? { title: spotTitle, sub: site ? spotKind(spotInfo.asPart, site.name) : "Not saved yet" }
    : { title: siteName, sub: partShort ?? (draw.areas.length ? "Your area needs a site" : undefined) };
  // Before an event is started: the chosen site's overview, or with none, the site chooser (All sites).
  const overview = !started && !spot;
  const allSites = overview && !siteSlug;
  // A chosen site's overview: the panel's header says which site and part, and what's been planted there.
  // The site's header, on its page and on a past season there (with the season after the part).
  const siteHeader = overview && !!siteSlug && !choosing;
  // The area whose sheet is open (a second tap on it on the map), while nothing else takes the panel.
  const sheetArea = areaSheet !== null && !draw.draft ? draw.areas.find((a) => a.id === areaSheet) : undefined;
  // What the panel shows, and how deep it sits, for its slide: the site list (the level of every site) 0,
  // a site's page 1, a season or the form 2 (the form from a season 3), an area's sheet over them 4.
  const panelScreen = sheetArea ? "area" : choosing || allSites ? "list" : season ? `season:${season.slug}` : overview ? `site:${siteSlug}:${parcel ?? ""}` : "form";
  const panelDepth = ({ area: 4, list: 0, form: startedFrom ? 3 : 2 } as Record<string, number>)[panelScreen] ?? (season ? 2 : 1);
  // The cross over the map (see `placing`); the map has to show, like Draw area.
  function startCross(mode: NonNullable<typeof placing> & string, partSite = "") {
    unlessEditing(() => {
      if (!placing) beforeCross.current = { snap, choosing, season };
      if (mode !== "spot" && mode !== "move") afterSave();
      endModes();
      draw.stop();
      partOf.current = partSite;
      // Where the cross starts, and what the hint measures from: the site a new location or sublocation is for,
      // the new location being moved (measured from its site), the pin being moved. A new site starts where the map is.
      const forSite = mode === "part" ? partSite : mode === "new" || mode === "spot" ? siteSlug : "";
      const moving = pinAt(siteSlug, parcel);
      const start = mode === "spot" ? spot : mode === "part" ? pinAt(partSite, null) : mode === "new" ? moving : null;
      if (start) setFocus([start[0], start[1]]);
      setCrossFrom(mode === "move" ? moving && { pins: [moving], label: "" } : forSite ? { pins: pinsOf(forSite), label: sites.find((x) => x.slug === forSite)?.name ?? "" } : null);
      setPlacing(mode);
      setSnap("peek");
    });
  }
  const startPlacing = () => startCross("new");
  // The site list's Create a new site: the pin is a new site even beside a known one.
  const startNewSite = () => startCross("site");
  // The form's Move pin: only the new location moves, still what it was.
  const moveSpot = () => startCross("spot");
  // The same cross moves a site's pin: the map is already centred on it.
  const startMoving = () => startCross("move");
  function cancelCross() {
    const b = beforeCross.current;
    setPlacing(false);
    setSnap(b.snap);
    if (b.choosing) setChoosing(true);
    if (b.season) setSeason(b.season);
  }
  // How far the cross is from where it's measured (see startCross), as the map moves; one reading a frame.
  const [crossFrom, setCrossFrom] = useState<{ pins: LngLat[]; label: string } | null>(null);
  const [crossKm, setCrossKm] = useState<number | null>(null);
  useEffect(() => {
    const m = map.current;
    if (!placing || !crossFrom || !m) return;
    let frame = 0;
    const onMove = () => {
      frame ||= requestAnimationFrame(() => { frame = 0; const c = mapCentre(map); setCrossKm(c && kmToNearest(crossFrom.pins, c)); });
    };
    onMove();
    m.on("move", onMove);
    return () => { m.off("move", onMove); cancelAnimationFrame(frame); };
  }, [placing, crossFrom, map]);
  const crossDistance = !crossFrom || crossKm === null ? "" : placing === "move" ? ` · moved ${kmLabel(crossKm)}` : ` · ${fromPin(crossKm, crossFrom.label)}`;
  const escape = useRef(cancelCross);
  useEffect(() => { escape.current = cancelCross; });
  useEffect(() => {
    if (!placing) return;
    // Not while a dialog is open (its own Esc closes it).
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.querySelector('[role="alertdialog"]')) escape.current(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [placing]);
  // Drawing another planted area: the phone sheet drops so the map shows. From the plant list, keeping it goes back there.
  const newArea = () => beginArea(false);
  function beginArea(list: boolean) {
    unlessEditing(() => {
      afterSave();
      endModes();
      fromList.current = list;
      setShownArea(null); // a new shape, not the one brought forward
      setSnap("peek");
      draw.start();
    });
  }
  // Stop: nothing kept. Drawn from the plant list, back to it (phones).
  function stopDrawing() {
    draw.stop();
    if (fromList.current && !wide) setSnap("full");
  }
  function undoMove() {
    move(siteSlug, parcel, null);
    setFocus(pinFor(allPins, siteSlug, parcel));
  }
  // Moving a site's pin changes more than this event, so it's asked first (saying how far it moves).
  const [pendingMove, setPendingMove] = useState<LngLat | null>(null);
  const movedFrom = pendingMove && pinAt(siteSlug, parcel);
  const movedBy = pendingMove && movedFrom ? kmBetween(movedFrom, pendingMove) : null;
  function movePin(at: LngLat) {
    setPendingMove(null);
    setPlacing(false);
    setSnap("mid"); // up again, to see the moved pin
    move(siteSlug, parcel, at);
    setFocus(at);
  }
  function dropPinHere() {
    const at = mapCentre(map);
    if (!at) return;
    if (placing === "move") return setPendingMove(at);
    setPlacing(false);
    // The new location moved: nothing else changes (its distance is to the same pin).
    if (placing === "spot") {
      setSpot(at);
      setFocus(at);
      // A new site: the nearest known pin again (is it now right by one?). At a site, its pin's distance is worked out live.
      if (!site) { const near = nearestPin(pins, at); setSpotNear(near && { label: near.pin.label, km: near.km, matched: false }); }
      return setSnap(beforeCross.current.snap);
    }
    if (!spot) beforeSpot.current = { started, slug: siteSlug, parcel, season: beforeCross.current.season };
    setStarted(true);
    setSnap("mid"); // up again, to name it
    setSpot(at);
    // A sublocation of the site it was asked for, however near another; its name, if typed, kept.
    if (placing === "part") {
      setSpotNear(null); // its distance is to its site (spotKm)
      setSpotInfo((i) => ({ ...i, asPart: true, decided: true }));
      return setPicked({ slug: partOf.current, parcelId: null });
    }
    const near = nearestPin(pins, at);
    // A new site is at no site we know, as "Keep it as a new site" leaves it (with entries at a site, asked first).
    if (placing === "site") {
      setSpotNear(near && { label: near.pin.label, km: near.km, matched: false });
      setSpotInfo((i) => ({ ...i, asPart: false, decided: true }));
      return moveTo("", null, true);
    }
    const matched = !!near && near.km <= NEAR_KM;
    setSpotNear(near && { label: near.pin.label, km: near.km, matched });
    setSpotInfo((i) => ({ ...i, asPart: false, decided: false }));
    // Near another site than an event's with entries: the same question as choosing it.
    if (matched) moveTo(near.pin.slug, near.pin.parcelId, true);
    else changeSite(); // not at a known site: say which it belongs to
  }
  // Phones: drop the sheet so the big map shows.
  const showMap = () => setSnap("peek");
  // The site's parts, for the dock's and the breadcrumb's menus; choosing one keeps the phone sheet where it is.
  const parts = site ? site.parts.map((p) => ({ id: p.id, name: partBesideSite(p.name, site.name), unsaved: p.unsaved })) : [];
  // The site page's places: a kept one says so, and how far it is from the site's own pins.
  const places = parts.map((p) => {
    if (!p.unsaved || !site) return p;
    const at = pinAt(siteSlug, p.id);
    const km = at && kmToNearest(pins.filter((x) => x.slug === siteSlug && x.parcelId !== p.id).map((x) => x.at), at);
    return { ...p, sub: km == null ? "Not saved yet" : `Not saved yet · ${fromPin(km, site.name)}` };
  });
  // New sublocation, where New location is offered: not once areas are drawn (or one's being drawn), nor for a new
  // location, nor once the event's saved without its plants (its place can't change).
  const addPart = draw.areas.length || draw.draft || spot || entry.partly || !site ? undefined : () => addSublocation(site.slug);
  // New location: not with areas drawn, and not with one already dropped (its Move pin moves it).
  const addLocation = draw.areas.length || spot || entry.partly ? undefined : startPlacing;
  // The phone title's and the breadcrumb's part menus: not for a new location, while the cross is up, or when the place can't change.
  const placeFixed = !!spot || !!placing || entry.partly;
  // The site list asks which site a new location (or an area drawn away from every site) is at.
  const forNew = spot ? { what: "location" as const, atSite: !!siteSlug } : !siteSlug && draw.areas.length > 0 ? { what: "area" as const, atSite: false } : undefined;
  // The map goes to the part's pin (or a new location), even when it's the part already chosen:
  // a new array each time, so the camera moves again.
  function choosePart(id: string | null) {
    if (id !== parcel && started && entry.saved) return leaveFor({ slug: siteSlug, parcelId: id });
    if (id !== parcel) return unlessEditing(() => goToPart(id));
    goToPart(id);
  }
  function goToPart(id: string | null) {
    setPlacing(false);
    setChoosing(false);
    setAreaSheet(null);
    setAreaAt(null);
    setPicked({ slug: siteSlug, parcelId: id });
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
  // The breadcrumb's site: up to the site as a whole, and the map goes to its pin.
  // With a new location in progress, its site's page: the location is kept (see KeptPlace); with entries, it asks first.
  function showSite() {
    if (spot && siteSlug) {
      const go = () => leaveFor({ slug: siteSlug, parcelId: null }, keepSpot());
      return entriesUnsaved ? setLeaving({ to: siteName, run: go }) : go();
    }
    unlessEditing(() => {
      if (choosing) closeChooser(true);
      setSeason(null);
      goToPart(null);
    });
  }
  // Keeps the dropped location for this visit: a part of its site, or a new site of its own (once: again, the same
  // place). Where it is now. Also after a planting event is saved there, and on Start another.
  const keptSpot = useRef<{ at: string; place: { slug: string; parcelId: string | null } } | null>(null);
  function keepSpot() {
    if (!spot) return null;
    if (keptSpot.current?.at === `${spot[0]},${spot[1]}`) return keptSpot.current.place;
    const n = kept.length + 1;
    const place: KeptPlace = site
      ? { site: siteSlug, id: `kept-${n}`, name: spotTitle, label: `${site.name} · ${spotTitle}`, at: spot }
      : { site: `kept-site-${n}`, id: null, name: spotTitle, label: spotTitle, at: spot };
    setKept((k) => [...k, place]);
    keptSpot.current = { at: `${spot[0]},${spot[1]}`, place: { slug: place.site, parcelId: place.id } };
    return keptSpot.current.place;
  }
  // A kept part isn't stored: the planting is saved at its site as a whole (the receipt says the location isn't).
  const saveAtKnownPlace: NonNullable<MapEventFormProps["onSave"]> = (input, id) => {
    const unsaved = sites.find((x) => x.slug === input.placeSlug)?.parts.find((p) => p.id === input.parcelId)?.unsaved;
    return onSave!({ ...input, parcelId: unsaved ? null : input.parcelId }, id);
  };
  // Lets the area go: nothing brought forward, and its sheet closed.
  function letGo() {
    setShownArea(null);
    setAreaSheet(null);
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
  // The area brought forward comes into view.
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
      endModes();
      setStarted(true);
      setPlantIn({ id });
      setSnap("full");
    });
  }
  // An area tapped in the bar: bring it forward and go there, even if it was already forward (the map may have moved).
  function showArea(id: number) {
    setAreaSheet(null);
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

  // The status bar is the header's green, even with the drawer full screen (it stops below it).
  // The page's theme-color, for Safari before 26; Safari 26 reads the band.
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) return;
    const was = meta.content;
    meta.content = HEADER_GREEN;
    return () => { meta.content = was; };
  }, []);

  const onSiteChange = useCallback((slug: string, parcelId: string | null) => {
    // The form says its site when it starts too: a season opened from the address stays open.
    if (slug !== siteSlug || parcelId !== parcel) setSeason(null);
    setSiteSlug(slug);
    setParcel(parcelId);
    highlightSite(map, slug);
    // A new location, or a kept area just drawn, stays in view; otherwise the site's (part's) pin.
    setFocus(spot ?? areaAt ?? pinAt(slug, parcelId));
  }, [map, spot, areaAt, pinAt, setSeason, setSiteSlug, setParcel, setFocus, siteSlug, parcel]);

  // The plant list needs the room: phones take the sheet full screen once it's in use.
  const onListFocus = () => { if (!wide) setSnap("full"); };

  // A mini map of the site or location, at the top of the site's page and of the form (it scrolls up with them): always on
  // desktop, and on phones when the sheet is full screen (covering the big map). A chosen site is named by the page's own
  // header, so the map leaves its label off; desktop has the big map beside it, so a slim strip.
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
      <TopBar siteName={spot || site ? where.title : undefined} hint={hint} exitHref={exitHref} onExit={exit} choosing={choosing} onChooseSite={toggleChooser} onLeaveSite={leaveSite} onAddLocation={addLocation} onDrawArea={newArea} onFindMe={findMe} />
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
            {placing === "move" ? `Line the cross up with ${parcel && partShort ? partShort : "the site"}` : "Move the map to the spot"}{crossDistance}
            <button type="button" className={s.hintCancel} onClick={cancelCross}>Cancel</button>
            <button type="button" className={s.hintMain} onClick={dropPinHere}>Drop pin here</button>
          </p>
        </>
      ) : (wide || snap === "peek") && (
        // Phones: just above the sheet at its bar. Pulled up, the sheet covers the map, so no bar.
        <DrawBar
          draw={draw} onAdd={newArea} onStop={stopDrawing} onShow={showArea} onClose={letGo} onPlant={plantIfOpen} plants={areaPlants} shown={shownArea}
          siteName={site?.name} partName={parcel ? partShort : undefined} part={parcel} parts={parts}
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
        // Phones, at a site: the title opens its parts, New sublocation and All sites; Search opens the site search.
        titleMenu={!wide && site && !placeFixed && !sheetArea && !draw.draft && !choosing ? (b) => (
          <PartMenu
            siteName={site.name} parts={parts} part={parcel} onChoosePart={choosePart} side="bottom"
            onAddPart={addPart} onAllSites={leaveSite} className={b.className} label={b.label}
          >
            {b.children}
          </PartMenu>
        ) : undefined}
        // Over a site, the list's way back is the same button, reading Close (the list's own header is hidden on phones).
        onSearch={wide || draw.draft ? undefined : choosing && siteSlug ? () => closeChooser(true) : searchSites} searchOpen={choosing && !!siteSlug}
        // Wide: the breadcrumb names the site and part, so in the form the title only shows when it's something else
        // (an area, a new location). With no site, and on a site's overview, it heads the panel as on phones.
        titleHidden={!!site && !sheetArea && !spot && !allSites && !siteHeader}
        above={
          <Crumbs
            siteName={site?.name} parts={parts} part={parcel} partName={parcel ? partShort : undefined}
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
            onWholeSite={entry.saved ? undefined : () => plantArea(WHOLE_SITE_KEY)} onClose={() => setAreaSheet(null)}
          />
        )}
        {/* Hidden, not closed, under the site list or an area's sheet: closing those comes back to an edit as it was. */}
        {season && siteSlug && (
          <PastSeason
            key={`season-${seasonKey}`} slug={siteSlug} parcelId={season.wholeSite ? null : parcel} season={season} today={today} canEdit={canEdit} species={options.species}
            actionSlot={headerAction} onHeaderButton={setSeasonButton} onDirty={onEditDirty} onSaving={onEditSaving} hidden={choosing || !!sheetArea}
            onBack={closeSeason} startLabel={eventUnsaved ? "Back to your planting event" : undefined} onStart={() => { afterSave(); setStartedFrom({ season, site: siteSlug, parcel }); endModes(); setStarted(true); }}
          />
        )}
        {(choosing || (allSites && !season && !sheetArea)) && (
          <SiteChooser
            // With no site there's nothing behind it to close back to.
            sites={sites} totals={totals} value={{ slug: siteSlug, parcelId: parcel }} onChoose={chooseSite} onClose={allSites ? undefined : () => closeChooser(true)}
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
            slug={siteSlug} parcelId={parcel} partName={parcel ? partName : undefined} today={today} totals={totals} map={miniMap}
            // The site's places (2+): each opens its page, as choosing it in the part menu does.
            places={parcel ? undefined : places} onPlace={choosePart}
            // With an event's entries kept (after its Back), the button goes back to it.
            onStart={() => { afterSave(); setStartedFrom(null); endModes(); setStarted(true); }} startLabel={eventUnsaved ? "Back to your planting event" : undefined} onOpenSeason={openSeason} pinMoved={isMoved(siteSlug, parcel)} onMovePin={draw.draft ? undefined : startMoving} onUndoPin={undoMove} />
        )}
        <MapEventForm
          key={`form-${formKey}`} hidden={overview || choosing || !!sheetArea || !!season} options={formOptions} // A site that isn't stored (a new one, or kept from earlier) can't be saved to yet: the receipt says "Not saved".
          onSave={onSave && site && !site.unsaved ? saveAtKnownPlace : undefined}
          onKeepLocation={() => leaveFor("all", keepSpot())} onSavedAtSpot={keepSpot} today={today} picked={picked}
          // A fresh form starts where the page is, not where it first opened.
          initialSite={siteSlug} initialPart={parcel} onEntries={setEntry} onChooseSite={changeSite}
          // The place tile: the site's parts and New sublocation in a menu, and Another site for the chooser.
          placeMenu={site && !spot ? (b) => (
            <PartMenu
              siteName={site.name} parts={parts} part={parcel} onChoosePart={choosePart} side="bottom"
              onAddPart={addPart} onOtherSite={changeSite} className={b.className} label={b.label}
            >
              {b.children}
            </PartMenu>
          ) : undefined}
          suggestions={suggestions[siteSlug] ?? []} onListFocus={onListFocus} onSiteChange={onSiteChange}
          spot={spot} spotNear={spotNear} nearKm={NEAR_KM}
          // How far the new location is from the pin of the site it's at.
          spotKm={spot && site ? kmToNearest(pinsOf(siteSlug), spot) : null}
          // Drawn areas far from the event's site: the furthest one's distance (a quiet note, as for a location).
          areaKm={site && draw.areas.length ? Math.max(...draw.areas.map((a) => kmToNearest(pinsOf(siteSlug), boundsOf(a.pts).getCenter().toArray() as LngLat) ?? 0)) : null} onAddSpot={draw.draft ? undefined : moveSpot} onRemoveSpot={cancelSpot} spotInfo={spotInfo} onSpotInfo={setSpotInfo}
          // The form's Back: where the form was started, the past season or the site's overview. A new location has no overview to go back to.
          // A new location with nothing entered: Back is its Cancel.
          onBack={spot ? (entriesUnsaved ? undefined : cancelSpot) : () => { formBack(); }}
          onFinish={finish}
          pinMoved={isMoved(siteSlug, parcel)}
          areas={draw.areas} areasListed={wide} plantIn={plantIn} onDrawArea={draw.draft ? undefined : () => beginArea(true)} onShowArea={showAreaFromForm} onPlantClose={() => { backTo.current = lastPlanted.current; if (!wide) setSnap("peek"); }} onAreaPlants={setAreaPlants} onAreaFocus={focusArea} onReset={() => { keepSpot(); clearEvent(); if (!wide) setSnap("mid"); }}
          plantedArea={miniMap}
        />
      </FormPanel>
      <ConfirmDialog
        open={!!pendingMove} title={`Move the pin for ${partShort && partShort !== "Whole site" ? `${siteName} · ${partShort}` : siteName}?`}
        confirmLabel="Move pin" onConfirm={() => pendingMove && movePin(pendingMove)} onCancel={() => setPendingMove(null)}
      >
        <ul>
          <li>{parcel && partShort ? `${partShort}'s` : "The site's main"} location moves here{movedBy !== null && `, ${kmLabel(movedBy)} from where it was`}, for every planting recorded at it, not just this one.</li>
          <li>Drawn planting areas stay where they are.</li>
          <li>Distances, and which site a new location counts as near, will use the new spot.</li>
          <li>Not saved yet: this prototype can&apos;t store changes.</li>
        </ul>
      </ConfirmDialog>
      <ConfirmDialog
        open={!!areaElsewhere} title={`This area is at ${areaElsewhere?.pin.label}`}
        confirmLabel="Start a new event there" cancelLabel="Keep drawing"
        onConfirm={newEventForArea} onCancel={() => setAreaElsewhere(null)}
      >
        This planting event is at {siteName}, and an event is at one site. Starting a new event at {areaElsewhere?.pin.label} clears what you&apos;ve entered here and keeps this area{draw.areas.length > 0 && `; ${draw.areas.length === 1 ? "the other area you drew is" : `the other ${draw.areas.length} areas you drew are`} removed`}.
      </ConfirmDialog>
      <ConfirmDialog
        open={!!pendingSite} title={`Move this event to ${sites.find((x) => x.slug === pendingSite?.slug)?.name ?? "another site"}?`}
        confirmLabel="Move event" cancelLabel={`Keep ${siteName}`}
        onConfirm={() => { const p = pendingSite; if (!p) return; setPendingSite(null); if (p.run) p.run(); else moveTo(p.slug, p.parcelId, false); }}
        onCancel={() => { setPendingSite(null); if (choosing) closeChooser(true); }}
      >
        What you&apos;ve entered moves with it.{draw.areas.length > 0 && <> {draw.areas.length === 1 ? "The area you drew stays where you drew it" : `The ${draw.areas.length} areas you drew stay where you drew them`}, at {siteName}, but the event would count them as at the new site.</>}
      </ConfirmDialog>
      <ConfirmDialog
        open={!!discard} title="Discard your changes?" confirmLabel="Discard changes" cancelLabel="Keep editing"
        onConfirm={() => { const run = discard?.run; onEditDirty(false); setDiscard(null); setSeasonKey((k) => k + 1); run?.(); }} onCancel={() => setDiscard(null)}
      >
        {editTried ? "Some of your changes were saved; the rest will be lost." : "Your changes to this past planting haven't been saved, and will be lost."}
      </ConfirmDialog>
      {/* A new event's entries, or only a drawing under way (it says so). */}
      <ConfirmDialog
        open={!!leaving} title={eventUnsaved ? "Leave this planting event?" : "Stop drawing this area?"}
        confirmLabel={eventUnsaved ? "Leave event" : "Stop drawing"} cancelLabel={eventUnsaved ? "Keep editing" : "Keep drawing"}
        onConfirm={() => { const run = leaving?.run; setLeaving(null); draw.stop(); run?.(); }} onCancel={() => setLeaving(null)}
      >
        {entry.partly ? "The event was saved without its plants. What you've entered here will be cleared"
          : eventUnsaved ? "It isn't saved. What you've entered will be cleared" : "It isn't finished, and will be cleared"}, and you&apos;ll see {leaving?.to} instead.
      </ConfirmDialog>
    </div>
  );
}

function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia(query).matches,
    // Before the page knows its width: a phone, whose sheet starts hidden below the screen.
    // (Wide here drew the side panel on phones until the scripts loaded.)
    () => false,
  );
}
