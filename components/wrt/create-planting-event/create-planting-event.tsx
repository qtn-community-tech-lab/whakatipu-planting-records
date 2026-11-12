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
 *   site-chooser        the sites-and-parts dialog
 *   site-overview       before the form: the index of sites, or what a tapped site has had planted
 *   draw-area/          drawing planted areas, and the bar along the bottom of the map
 *   navigator/          wide screens: the panel's breadcrumb and area list, the map's toolbar and keys
 *   part-menu           the site's parts in a menu (the phone dock and the wide breadcrumb)
 *   use-keyboard-fit.ts phones: the screen shrinks above the keyboard
 * Shared pieces: FormPanel (the form's panel), MiniMap and FigureList (components/wrt/shared).
 */
import type { Route } from "next";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MapEventForm, WHOLE_SITE_KEY, type AreaPick, type PlantTotals, type SpotInfo } from "@/components/wrt/events/map-event-form";
import type { EventFormOptions } from "@/lib/wrt/events/form-options";
import type { SpeciesSuggestion } from "@/lib/wrt/events/site-suggestions";
import { MAP_EVENT_STEPS, STEP } from "@/lib/wrt/events/steps";
import { partBesideSite } from "@/lib/wrt/text";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormPanel, SHEET_HEIGHT, type Snap } from "@/components/wrt/shared/form-panel";
import { MiniMap, NEW_PIN_CLASS } from "@/components/wrt/shared/mini-map";
import { paddingFor } from "./layout";
import { nearestPin, pinFor, sitePins, type LngLat, type SitePin } from "./sites";
import { SiteOverview, SiteIndex } from "./site-overview";
import { SiteChooser } from "./site-chooser";
import { TopBar } from "./top-bar";
import { usePinMoves } from "./use-pin-moves";
import { AreaOverlay, AreaSheet, DrawBar, useDrawArea, type OnKeep } from "./draw-area";
import { highlightSite, mapCentre, useCamera, usePlantingMap, useSpotMarker } from "./use-planting-map";
import { boundsOf, fitArea } from "./map-scene";
import { useKeyboardFit } from "./use-keyboard-fit";
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
  options: EventFormOptions;
  /** NZ today, "YYYY-MM-DD". */
  today: string;
  /** Where the back arrow goes. */
  exitHref: Route;
  /** Each site's most planted species, by site slug, for step 2. */
  suggestions: Record<string, SpeciesSuggestion[]>;
  /** Plants and species recorded at each site ("slug") and part ("slug/part id"), for the site chooser. */
  totals: PlantTotals;
  /** Every area with its pin, from the areas table. */
  areas: Parameters<typeof sitePins>[1];
}

export function CreatePlantingEvent({ initialSite, options, today, exitHref, suggestions, totals, areas }: CreatePlantingEventProps) {
  const wide = useMedia(WIDE);
  const mapEl = useRef<HTMLDivElement>(null);
  const [screen, setScreen] = useState<HTMLDivElement | null>(null);
  useKeyboardFit(screen);
  // Phones start with the sheet at its bar, so the map shows first.
  const [snap, setSnap] = useState<Snap>("peek");
  const [basePins] = useState(() => sitePins(options.sites, areas, totals));
  const { pins, pinAt, isMoved, move } = usePinMoves(basePins);
  // A pin clicked on the map (a new object each click, so clicking the same pin again still counts);
  // the form takes it up and reports its choice back as `siteSlug`.
  const [picked, setPicked] = useState<{ slug: string; parcelId: string | null } | null>(null);
  const [siteSlug, setSiteSlug] = useState(initialSite);
  const [parcel, setParcel] = useState<string | null>(null);
  // What the camera centres: the new location if there is one, else the chosen site's (part's) pin.
  const [focus, setFocus] = useState<LngLat | null>(null);
  const site = options.sites.find((x) => x.slug === siteSlug);
  const siteName = site?.name ?? "Choose a site";
  const partName = site ? site.parts.find((p) => p.id === parcel)?.name ?? "The site as a whole" : undefined;
  // Beside the site's name, the part without the site in front of it: "Morning Star Reserve", not "Arthurs Point - Morning Star Reserve".
  const partShort = partName && site ? partBesideSite(partName, site.name) : partName;
  // The site title (and the form's "Choose a site") opens the chooser in the panel's place: sites with
  // their parts. On phones the sheet goes full screen for it, and after a choice comes back to at least
  // half way (to show it); closed without one (`back`), it goes back exactly where it was.
  const [choosing, setChoosing] = useState(false);
  const snapBefore = useRef<Snap>("mid");
  function changeSite() {
    setAreaSheet(null);
    if (!choosing) snapBefore.current = snap; // already open: keep where it was before
    setChoosing(true);
    if (!wide) setSnap("full");
  }
  function closeChooser(back = false) {
    setChoosing(false);
    if (!wide) setSnap(!back && snapBefore.current === "peek" ? "mid" : snapBefore.current);
  }
  // The buttons that name the site (header pill, panel title, breadcrumb, dock) toggle it: a second tap closes.
  // Everything else that asks for a site (a kept area, a dropped pin, Another site) only ever opens it.
  const toggleChooser = () => (choosing ? closeChooser(true) : changeSite());
  // Another site, once areas are drawn at this one, asks first: the areas don't move with it.
  const [pendingSite, setPendingSite] = useState<{ slug: string; parcelId: string | null } | null>(null);
  function chooseSite(slug: string, parcelId: string | null) {
    if (started && siteSlug && slug !== siteSlug && draw.areas.length && !pendingSite) return setPendingSite({ slug, parcelId });
    setPendingSite(null);
    setAreaAt(null);
    setPicked({ slug, parcelId });
    closeChooser();
  }

  // A tapped site first shows what's been planted there; "Add new planting event" opens the form.
  const [started, setStarted] = useState(false);
  // Another site's pin, or "all" (the header's ×: back to every site).
  const [leaving, setLeaving] = useState<SitePin | "all" | null>(null);
  // Which step the form is on, for the header's hint.
  const [step, setStep] = useState(0);
  const [formKey, setFormKey] = useState(0);

  // The area whose plants are being entered on "What was planted", or tapped on the map or in its bar: the map fits it and darkens the rest.
  const [shownArea, setShownArea] = useState<number | null>(null);
  const map = usePlantingMap({ pins, initialSite, container: mapEl, pinClass: s.pin ?? "", wideQuery: WIDE, onPick: pickPin, onTap: tapMap });

  // A pin chooses its site (and part, for a part's own pin) and brings the phone sheet up halfway.
  function pickPin(pin: SitePin) {
    // Mid-event, another site's pin asks first: the event isn't finished.
    if (started && pin.slug !== siteSlug) return setLeaving(pin);
    setAreaAt(null);
    setChoosing(false);
    setAreaSheet(null);
    setPicked({ slug: pin.slug, parcelId: pin.parcelId });
    setSnap("mid");
  }

  // Looking at a site (before starting an event), a tap on the map away from its pin goes back to every site.
  // (Taps on drawn areas are the draw hook's: see onTapArea.)
  function tapMap(at: { x: number; y: number }) {
    if (started || !siteSlug || draw.draft || placing || !map.current) return;
    const pin = pinAt(siteSlug, parcel);
    const p = pin && map.current.project(pin);
    if (p && Math.hypot(p.x - at.x, p.y - at.y) < AWAY_PX) return;
    setPicked({ slug: "", parcelId: null });
  }

  // A new location: a cross sits in the middle of the map you can see (above the phone sheet,
  // beside the desktop panel); move the map under it and place the pin. The nearest site is chosen.
  // "new": dropping a new location. "move": moving the chosen site's pin, which is in the wrong spot.
  const [placing, setPlacing] = useState<false | "new" | "move">(false);
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
  const keepArea: OnKeep = (pts, others) => {
    const at = boundsOf(pts).getCenter().toArray() as LngLat;
    const near = nearestPin(pins, at);
    const pin = near && near.km <= NEAR_KM ? near.pin : null;
    if (pin && siteSlug && pin.slug !== siteSlug) {
      setAreaElsewhere({ pin, at });
      return false;
    }
    setAreaAt(at);
    setFocus(at);
    setStarted(true);
    // Drawn from the plant list's Add area: back to the list (it opens on the new area), so its plants go in next.
    if (!wide && step === STEP.whatPlanted) setSnap("full");
    if (pin && others === 0) setPicked({ slug: pin.slug, parcelId: pin.parcelId });
    else if (!pin && !siteSlug) changeSite();
    return true;
  };
  // A tap on a kept area brings it forward and goes to it (as its button in the bar does); elsewhere, lets it go.
  // A tap on the one already forward opens its sheet: planting in that area.
  const [areaSheet, setAreaSheet] = useState<number | null>(null);
  function tapArea(id: number | null) {
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
  // Plants listed in each area (by area id), reported by the form, for the area buttons on the map.
  const [areaPlants, setAreaPlants] = useState<Record<number, number>>({});
  function removeSpot() {
    setSpot(null);
    setSpotNear(null);
    setSpotInfo({ name: "", asPart: false });
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
    // Past the first step the list needs the full screen to scroll (half way, every drag moves the sheet),
    // so half way isn't a stop: from full screen it carries on down to the bar, from the bar up to full screen.
    const tall = started && step !== STEP.whereWhen && !sheetArea;
    setSnap(tall && to === "mid" ? (snap === "full" ? "peek" : "full") : to);
  }
  function leaveFor(to: SitePin | "all") {
    setLeaving(null);
    setStarted(false);
    clearEvent();
    setFormKey((k) => k + 1);
    setPicked(to === "all" ? { slug: "", parcelId: null } : { slug: to.slug, parcelId: to.parcelId });
    setSnap("mid");
  }
  // The header's ×: back to every site. Mid-event it asks first, like another site's pin does.
  function leaveSite() {
    if (started) setLeaving("all");
    else leaveFor("all");
  }
  // Under the site in the header: the step the form is on, or the part, so the map says where you are.
  const hint = started ? `${MAP_EVENT_STEPS[step]!.title} · step ${step + 1} of ${MAP_EVENT_STEPS.length}` : parcel && partShort ? partShort : undefined;
  // What the header, the title and the mini map call this site or location. While a new location is being
  // added, that's what it is: never just the site's name, so it can't be mistaken for the site itself.
  const where = spot
    ? { title: spotInfo.name.trim() || "New location", sub: !site ? "New site" : `${spotInfo.asPart ? "Sublocation of" : "New location near"} ${site.name}` }
    : { title: siteName, sub: partShort ?? (draw.areas.length ? "Your area needs a site" : undefined) };
  // Before an event is started: the chosen site's overview, or with none, the index of sites.
  const overview = !started && !spot;
  // The area whose sheet is open (a second tap on it on the map), while nothing else takes the panel.
  const sheetArea = areaSheet !== null && !draw.draft ? draw.areas.find((a) => a.id === areaSheet) : undefined;
  function startPlacing() {
    draw.stop();
    setPlacing("new");
    setSnap("peek"); // the map has to show, like Draw area
  }
  // The same cross moves a site's pin: the map is already centred on it.
  function startMoving() {
    draw.stop();
    setPlacing("move");
    setSnap("peek");
  }
  // Drawing another planted area: the phone sheet drops so the map shows.
  function newArea() {
    setPlacing(false);
    setAreaSheet(null);
    setShownArea(null); // a new shape, not the one brought forward
    setSnap("peek");
    draw.start();
  }
  function undoMove() {
    move(siteSlug, parcel, null);
    setFocus(pinFor(basePins, siteSlug, parcel));
  }
  // Moving a site's pin changes more than this event, so it's asked first.
  const [pendingMove, setPendingMove] = useState<LngLat | null>(null);
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
    setStarted(true);
    setSnap("mid"); // up again, to name it
    setSpot(at);
    const near = nearestPin(pins, at);
    const matched = !!near && near.km <= NEAR_KM;
    setSpotNear(near && { label: near.pin.label, km: near.km, matched });
    if (matched) setPicked({ slug: near.pin.slug, parcelId: near.pin.parcelId });
    else changeSite(); // not at a known site: say which it belongs to
  }
  // Phones: drop the sheet so the big map shows.
  const showMap = () => setSnap("peek");
  // The site's parts, for the dock's and the breadcrumb's menus; choosing one keeps the phone sheet where it is.
  const parts = site ? site.parts.map((p) => ({ id: p.id, name: partBesideSite(p.name, site.name) })) : [];
  function choosePart(id: string | null) {
    setAreaAt(null);
    setPicked({ slug: siteSlug, parcelId: id });
  }
  useMapKeys({
    on: wide, areas: draw.areas, shown: shownArea, drawing: !!draw.draft || !!placing,
    onDraw: newArea, onStop: draw.stop, onShow: showArea, onLetGo: () => setShownArea(null),
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
  function plantArea(id: AreaPick) {
    setAreaSheet(null);
    setStarted(true);
    setPlantIn({ id });
    setSnap("full");
  }
  // An area tapped in the bar: bring it forward and go there, even if it was already forward (the map may have moved).
  function showArea(id: number) {
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
    setSiteSlug(slug);
    setParcel(parcelId);
    highlightSite(map, slug);
    // A new location, or a kept area just drawn, stays in view; otherwise the site's (part's) pin.
    setFocus(spot ?? areaAt ?? pinAt(slug, parcelId));
  }, [map, spot, areaAt, pinAt]);

  function onStepChange(step: number) {
    setStep(step);
    // The species list and the check need the room: take the phone sheet full screen for them.
    if (step !== STEP.whereWhen) setSnap("full");
  }

  return (
    <div ref={setScreen} className={s.screen} data-full-screen="" data-drawing={draw.draft ? "" : undefined}>
      <div ref={mapEl} className={s.map} />
      {/* Phones: a see-through green band behind the header; Safari tints its top bar from it. */}
      <div className={s.topBand} aria-hidden="true" />
      <AreaOverlay map={map} draw={draw} shown={shownArea} />
      <TopBar siteName={spot || site ? where.title : undefined} hint={hint} exitHref={exitHref} choosing={choosing} onChooseSite={toggleChooser} onLeaveSite={leaveSite} onAddLocation={draw.areas.length ? undefined : startPlacing} onDrawArea={newArea} />
      {wide && (
        <MapTools
          map={map} drawing={!!draw.draft || !!placing} onDraw={newArea} onAddLocation={draw.areas.length ? undefined : startPlacing}
          areas={draw.areas.length} shown={draw.areas.findIndex((a) => a.id === shownArea)} onLetGo={() => setShownArea(null)}
          // From none brought forward, next is the first and previous the last.
          onStep={(by) => { const n = draw.areas.length, i = draw.areas.findIndex((a) => a.id === shownArea); const a = draw.areas[i < 0 ? (by > 0 ? 0 : n - 1) : (i + by + n) % n]; if (a) showArea(a.id); }}
        />
      )}
      {placing ? (
        <>
          {cross && <span className={s.cross} style={cross} aria-hidden="true" />}
          {/* On phones, just above the sheet while it's at its bar; under the header once it's pulled up. */}
          <p className={s.hint} role="status" style={!wide && snap === "peek" ? { top: "auto", bottom: SHEET_HEIGHT.peek + 12 } : undefined}>
            {placing === "move" ? "Line the cross up with the site" : "Move the map to the spot"}
            <button type="button" className={s.hintCancel} onClick={() => setPlacing(false)}>Cancel</button>
            <button type="button" className={s.hintMain} onClick={dropPinHere}>Drop pin here</button>
          </p>
        </>
      ) : (wide || snap === "peek") && (
        // Phones: just above the sheet at its bar. Pulled up, the sheet covers the map, so no bar.
        <DrawBar
          draw={draw} onAdd={newArea} onShow={showArea} onClose={() => setShownArea(null)} onPlant={plantArea} plants={areaPlants} shown={shownArea}
          siteName={site?.name} partName={parcel ? partShort : undefined} part={parcel} parts={parts}
          onChoosePart={choosePart} onChangeSite={changeSite} choosing={choosing} onToggleSite={toggleChooser} dock={!wide}
          style={wide ? undefined : { bottom: SHEET_HEIGHT.peek + 12 }}
        />
      )}
      <FormPanel
        wide={wide} open container={screen} snap={snap} onSnap={snapTo} label="New planting event" locked={!!draw.draft}
        title={sheetArea ? sheetArea.name || "Planted area" : where.title}
        subtitle={sheetArea ? (site ? `Planted area at ${siteName}` : "Planted area") : where.sub}
        onTitle={wide || draw.draft || sheetArea ? undefined : toggleChooser} titleOpen={choosing}
        // Wide: the breadcrumb names the site and part, so the title only shows when it's something else (an area, a new location).
        titleHidden={!sheetArea && !spot}
        above={
          <Crumbs
            siteName={site?.name} parts={parts} part={parcel} partName={parcel ? partShort : undefined}
            choosing={choosing} onAllSites={leaveSite} onChooseSite={toggleChooser} onChoosePart={choosePart}
          />
        }
        below={
          <AreaList
            areas={draw.areas} shown={shownArea} plants={areaPlants} firstStep={!started || step === STEP.whereWhen} drawing={!!draw.draft}
            onShow={showArea} onReshape={(i) => draw.start(i)} onPlant={plantArea} onDraw={newArea}
          />
        }
      >
        {sheetArea && (
          <AreaSheet
            area={sheetArea} site={site ? (parcel && partShort ? partShort : siteName) : undefined} plants={areaPlants[sheetArea.id] ?? 0}
            onPlant={() => plantArea(sheetArea.id)}
            onWholeSite={() => plantArea(WHOLE_SITE_KEY)}
          />
        )}
        {choosing && (
          <SiteChooser
            sites={options.sites} totals={totals} value={{ slug: siteSlug, parcelId: parcel }} onChoose={chooseSite} onClose={() => closeChooser(true)}
            forNew={spot ? { what: "location", atSite: !!siteSlug } : !siteSlug && draw.areas.length > 0 ? { what: "area", atSite: false } : undefined}
            onKeepNew={() => { setPicked({ slug: "", parcelId: null }); setSpotInfo((i) => ({ ...i, asPart: false })); closeChooser(); }}
            onAddLocation={draw.areas.length ? undefined : () => { setChoosing(false); startPlacing(); }} onDrawArea={() => { setChoosing(false); newArea(); }}
            onAddSublocation={(slug) => { setChoosing(false); setPicked({ slug, parcelId: null }); setSpotInfo({ name: "", asPart: true }); startPlacing(); }}
          />
        )}
        {overview && !choosing && !sheetArea && (siteSlug
          ? <SiteOverview slug={siteSlug} parcelId={parcel} partName={parcel ? partName : undefined} onStart={() => setStarted(true)} pinMoved={isMoved(siteSlug, parcel)} onMovePin={startMoving} onUndoPin={undoMove} />
          : <SiteIndex sites={options.sites} totals={totals} onChoose={(slug) => chooseSite(slug, null)} onStart={() => setStarted(true)} onAddLocation={startPlacing} onDrawArea={newArea} />)}
        <MapEventForm
          key={formKey} hidden={overview || choosing || !!sheetArea} options={options} today={today} initialSite={initialSite} picked={picked} onChooseSite={changeSite}
          suggestions={suggestions[siteSlug] ?? []} onStepChange={onStepChange} onSiteChange={onSiteChange}
          spot={spot} spotNear={spotNear} onAddSpot={startPlacing} onRemoveSpot={removeSpot} spotInfo={spotInfo} onSpotInfo={setSpotInfo}
          pinMoved={isMoved(siteSlug, parcel)}
          areas={draw.areas} areasListed={wide} plantIn={plantIn} onPlant={plantArea} onRemoveArea={(id) => draw.remove(draw.areas.findIndex((x) => x.id === id))} onDrawArea={newArea} onShowArea={showAreaFromForm} onPlantClose={() => { backTo.current = lastPlanted.current; if (!wide) setSnap("peek"); }} onAreaPlants={setAreaPlants} onAreaFocus={focusArea} onReset={() => { clearEvent(); if (!wide) setSnap("mid"); }}
          // A mini map of the site or location: always on desktop, and on phones when the sheet is full screen (covering the big map).
          plantedArea={focus && (wide || snap === "full") ? <MiniMap at={focus} areas={draw.areas.map((a) => a.pts)} label={where.title} sub={where.sub} isNew={!!spot} onOpen={wide ? undefined : showMap} /> : undefined}
        />
      </FormPanel>
      <ConfirmDialog
        open={!!pendingMove} title={`Move the pin for ${partShort && partShort !== "The site as a whole" ? `${siteName} · ${partShort}` : siteName}?`}
        confirmLabel="Move pin" onConfirm={() => pendingMove && movePin(pendingMove)} onCancel={() => setPendingMove(null)}
      >
        <ul>
          <li>The site&apos;s main location moves here, for every planting recorded at it, not just this one.</li>
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
        This planting event is at {siteName}, and an event is at one site. Starting a new event at {areaElsewhere?.pin.label} clears what you&apos;ve entered here and keeps this area.
      </ConfirmDialog>
      <ConfirmDialog
        open={!!pendingSite} title={`Move this event to ${options.sites.find((x) => x.slug === pendingSite?.slug)?.name ?? "another site"}?`}
        confirmLabel="Move event" cancelLabel={`Keep ${siteName}`}
        onConfirm={() => pendingSite && chooseSite(pendingSite.slug, pendingSite.parcelId)} onCancel={() => setPendingSite(null)}
      >
        {draw.areas.length === 1 ? "The area you drew stays where you drew it" : `The ${draw.areas.length} areas you drew stay where you drew them`}, at {siteName}, but the event would count them as at the new site.
      </ConfirmDialog>
      <ConfirmDialog
        open={!!leaving} title="Leave this planting event?" confirmLabel="Leave event" cancelLabel="Keep editing"
        onConfirm={() => leaving && leaveFor(leaving)} onCancel={() => setLeaving(null)}
      >
        It isn&apos;t finished. What you&apos;ve entered will be cleared, and you&apos;ll see {leaving === "all" ? "every site" : leaving?.label} instead.
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
