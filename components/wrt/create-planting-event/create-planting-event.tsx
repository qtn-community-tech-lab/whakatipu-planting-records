"use client";
/**
 * The record sheet: a full-screen satellite map with a pin for every site,
 * and the planting-event form over it (on the left on wide screens, in a
 * bottom drawer on phones). Clicking a pin chooses that site in the form;
 * choosing a site in the form highlights its pin and flies there.
 *
 * This file only wires the parts together:
 *   layout.ts           the map padding the form leaves
 *   sites.ts            the pins, from data/site-locations.json
 *   map-scene.ts        MapLibre: the map and the pins
 *   use-record-map.ts   starting the map, and keeping the chosen site in view
 *   use-pin-moves.ts    site pins moved because they were in the wrong place
 *   top-bar             back, the site, and the + menu
 *   site-chooser        the sites-and-parts dialog
 *   place-overview      before the form: the index of sites, or what a tapped site has had planted
 *   draw-area/          drawing planted areas, and the bar along the bottom of the map
 * Shared pieces: FormPanel (the form's panel), MiniMap and FigureList (components/wrt/shared).
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MapEventForm, type PlantTotals, type SpotInfo } from "@/components/wrt/events/map-event-form";
import type { EventFormOptions } from "@/lib/wrt/events/form-options";
import type { SpeciesSuggestion } from "@/lib/wrt/events/site-suggestions";
import { STEP } from "@/lib/wrt/events/steps";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormPanel, SHEET_HEIGHT, type Snap } from "@/components/wrt/shared/form-panel";
import { MiniMap, NEW_PIN_CLASS } from "@/components/wrt/shared/mini-map";
import { paddingFor } from "./layout";
import { nearestPin, pinFor, sitePins, type LngLat, type SitePin } from "./sites";
import { PlaceOverview, SiteIndex } from "./site-overview";
import { SiteChooser } from "./site-chooser";
import { TopBar } from "./top-bar";
import { usePinMoves } from "./use-pin-moves";
import { AreaOverlay, DrawBar, useDrawArea, type OnKeep } from "./draw-area";
import { highlightSite, mapCentre, useCamera, useRecordMap, useSpotMarker } from "./use-planting-map";
import { boundsOf } from "./map-scene";
import s from "./create-planting-event.module.css";

const WIDE = "(min-width: 768px)";
/** A new location this close to a site's (or part's) pin counts as that site. */
const NEAR_KM = 1.5;

export interface RecordSheetProps {
  /** Site slug to start at, or "" to start with every site in view. */
  initialSite: string;
  options: EventFormOptions;
  /** NZ today, "YYYY-MM-DD". */
  today: string;
  /** Where the back arrow goes. */
  exitHref: string;
  /** Each site's most planted species, by site slug, for step 2. */
  suggestions: Record<string, SpeciesSuggestion[]>;
  /** Plants and species recorded at each site ("slug") and part ("slug/part id"), for the site chooser. */
  totals: PlantTotals;
  /** Every area with its pin, from the areas table. */
  areas: Parameters<typeof sitePins>[1];
}

export function RecordSheet({ initialSite, options, today, exitHref, suggestions, totals, areas }: RecordSheetProps) {
  const wide = useMedia(WIDE);
  const mapEl = useRef<HTMLDivElement>(null);
  const [screen, setScreen] = useState<HTMLDivElement | null>(null);
  // Phones start with the sheet at its bar, so the map shows first.
  const [snap, setSnap] = useState<Snap>("peek");
  const [basePins] = useState(() => sitePins(options.sites, areas, totals));
  const { pins, pinAt, isMoved, move } = usePinMoves(basePins);
  // A pin clicked on the map (a new object each click, so clicking the same pin again still counts);
  // the form takes it up and reports its choice back as `place`.
  const [picked, setPicked] = useState<{ slug: string; parcelId: string | null } | null>(null);
  const [place, setPlace] = useState(initialSite);
  const [parcel, setParcel] = useState<string | null>(null);
  // What the camera centres: the new location if there is one, else the chosen site's (part's) pin.
  const [focus, setFocus] = useState<LngLat | null>(null);
  const placeSite = options.sites.find((x) => x.slug === place);
  const placeName = placeSite?.name ?? "Choose a site";
  const partName = placeSite ? placeSite.parts.find((p) => p.id === parcel)?.name ?? "The site as a whole" : undefined;
  // The site title (and the form's "Choose a site") opens the chooser: sites with their parts.
  const [choosing, setChoosing] = useState(false);
  const changeSite = useCallback(() => setChoosing(true), []);
  function chooseSite(slug: string, parcelId: string | null) {
    setAreaAt(null);
    setChoosing(false);
    setPicked({ slug, parcelId });
    setSnap((at) => (at === "peek" ? "mid" : at));
  }

  // A tapped site first shows what's been planted there; "Add new planting event" opens the form.
  const [started, setStarted] = useState(false);
  const [leaving, setLeaving] = useState<SitePin | null>(null);
  const [formKey, setFormKey] = useState(0);

  const map = useRecordMap({ pins, initialSite, container: mapEl, pinClass: s.pin, wideQuery: WIDE, onPick: pickPin });

  // A pin chooses its site (and part, for a part's own pin) and brings the phone sheet up halfway.
  function pickPin(pin: SitePin) {
    // Mid-event, another site's pin asks first: the event isn't finished.
    if (started && pin.slug !== place) return setLeaving(pin);
    setAreaAt(null);
    setPicked({ slug: pin.slug, parcelId: pin.parcelId });
    setSnap("mid");
  }

  // A new location: a cross sits in the middle of the map you can see (above the phone sheet,
  // beside the desktop panel); move the map under it and place the pin. The nearest site is chosen.
  // "new": dropping a new location. "move": moving the chosen site's pin, which is in the wrong place.
  const [placing, setPlacing] = useState<false | "new" | "move">(false);
  const [spot, setSpot] = useState<LngLat | null>(null);
  // The pin nearest the new location: within NEAR_KM it fills in the site (and part); further, the form asks.
  const [spotNear, setSpotNear] = useState<{ label: string; km: number; matched: boolean } | null>(null);
  // The new location's name, and whether it's a new location near the site or a sublocation of it. Not saved yet.
  const [spotInfo, setSpotInfo] = useState<SpotInfo>({ name: "", asPart: false });
  // Where the last kept area is, so the camera stays on it when the place changes to match.
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
    if (pin && place && pin.slug !== place) {
      setAreaElsewhere({ pin, at });
      return false;
    }
    setAreaAt(at);
    setFocus(at);
    if (pin && others === 0) setPicked({ slug: pin.slug, parcelId: pin.parcelId });
    else if (!pin && !place) setChoosing(true);
    return true;
  };
  const draw = useDrawArea(map, keepArea);
  // Plants listed in each area (by area id), reported by the form, for the area buttons on the map.
  const [areaPlants, setAreaPlants] = useState<Record<number, number>>({});
  // The area whose plants are being entered on "What was planted": the map fits it and darkens the rest.
  const [shownArea, setShownArea] = useState<number | null>(null);
  function removeSpot() {
    setSpot(null);
    setSpotNear(null);
    setSpotInfo({ name: "", asPart: false });
  }
  // A fresh form (new key) at the other site, back on its overview.
  // The area at another site starts a new event there: what was entered is cleared, the area kept.
  function newEventForArea() {
    if (!areaElsewhere) return;
    const { pin, at } = areaElsewhere;
    setAreaElsewhere(null);
    removeSpot();
    draw.clearKept();
    setFormKey((k) => k + 1);
    setPicked({ slug: pin.slug, parcelId: pin.parcelId });
    setAreaAt(at);
    setFocus(at);
    draw.done(true);
  }
  // Phones: the sheet coming up covers the map, so a drawing ends first: a closed shape is kept
  // (unless it's held to ask something; then the sheet stays down), an unfinished one dropped.
  function snapTo(to: Snap) {
    if (!wide && to !== "peek" && draw.draft) {
      if (!draw.draft.closed) draw.stop();
      else if (!draw.done()) return;
    }
    setSnap(to);
  }
  function leaveFor(pin: SitePin) {
    setLeaving(null);
    setStarted(false);
    removeSpot();
    draw.clear();
    setAreaAt(null);
    setFormKey((k) => k + 1);
    setPicked({ slug: pin.slug, parcelId: pin.parcelId });
    setSnap("mid");
  }
  // What the header, the title and the mini map call this place. While a new location is being
  // added, that's what it is: never just the site's name, so it can't be mistaken for the site itself.
  const where = spot
    ? { title: spotInfo.name.trim() || "New location", sub: !placeSite ? "Not at a known site yet" : `${spotInfo.asPart ? "Sublocation of" : "New location near"} ${placeSite.name}` }
    : { title: placeName, sub: partName };
  // Before an event is started: the chosen site's overview, or with none, the index of sites.
  const overview = !started && !spot;
  function startPlacing() {
    draw.stop();
    setStarted(true);
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
    setStarted(true);
    setSnap("peek");
    draw.start();
  }
  function undoMove() {
    move(place, parcel, null);
    setFocus(pinFor(basePins, place, parcel));
  }
  // Moving a site's pin changes more than this event, so it's asked first.
  const [pendingMove, setPendingMove] = useState<LngLat | null>(null);
  function movePin(at: LngLat) {
    setPendingMove(null);
    setPlacing(false);
    setSnap("mid"); // up again, to see the moved pin
    move(place, parcel, at);
    setFocus(at);
  }
  function placeHere() {
    const at = mapCentre(map);
    if (!at) return;
    if (placing === "move") return setPendingMove(at);
    setPlacing(false);
    setSnap("mid"); // up again, to name it
    setSpot(at);
    const near = nearestPin(pins, at);
    const matched = !!near && near.km <= NEAR_KM;
    setSpotNear(near && { label: near.pin.label, km: near.km, matched });
    if (matched) setPicked({ slug: near.pin.slug, parcelId: near.pin.parcelId });
    else setChoosing(true); // not at a known site: say which it belongs to
  }
  // Phones: drop the sheet so the big map shows.
  const showMap = () => setSnap("peek");

  // The cross sits where the map's centre is: the middle of the padding the form leaves.
  const pad = paddingFor(wide, snap, screen?.clientHeight ?? 0);
  const cross = screen && {
    left: pad.left + (screen.clientWidth - pad.left - pad.right) / 2,
    top: pad.top + (screen.clientHeight - pad.top - pad.bottom) / 2,
  };
  useSpotMarker(map, spot, NEW_PIN_CLASS);
  useCamera(map, wide, snap, focus, pins);
  // Fit the shown area in the map the form leaves, with a margin round it (and room for the bar on
  // desktop). Only the margin goes here: MapLibre adds it to the map's own padding, which already
  // leaves out the form.
  const shownPts = draw.areas.find((a) => a.id === shownArea)?.pts;
  useEffect(() => {
    const m = map.current;
    if (!m || !shownPts) return;
    m.fitBounds(boundsOf(shownPts), { padding: { top: 40, bottom: wide ? 170 : 40, left: 40, right: 40 }, maxZoom: 17, duration: 800 });
  }, [map, shownPts, wide]);

  const onPlaceChange = useCallback((placeSlug: string, parcelId: string | null) => {
    setPlace(placeSlug);
    setParcel(parcelId);
    highlightSite(map, placeSlug);
    // A new location, or a kept area just drawn, stays in view; otherwise the site's (part's) pin.
    setFocus(spot ?? areaAt ?? pinAt(placeSlug, parcelId));
  }, [map, spot, areaAt, pinAt]);

  const onStepChange = useCallback((step: number) => {
    // The species list needs the room: take the phone sheet full screen for it.
    if (step === STEP.whatPlanted) setSnap("full");
  }, []);

  return (
    <div ref={setScreen} className={s.screen} data-drawing={draw.draft ? "" : undefined}>
      <div ref={mapEl} className={s.map} />
      <AreaOverlay map={map} draw={draw} shown={shownArea} />
      <TopBar siteName={spot || placeSite ? where.title : undefined} exitHref={exitHref} onChooseSite={changeSite} onAddLocation={startPlacing} onDrawArea={newArea} />
      {placing ? (
        <>
          {cross && <span className={s.cross} style={cross} aria-hidden="true" />}
          {/* On phones, just above the sheet while it's at its bar; under the header once it's pulled up. */}
          <p className={s.hint} role="status" style={!wide && snap === "peek" ? { top: "auto", bottom: SHEET_HEIGHT.peek + 12 } : undefined}>
            {placing === "move" ? "Line the cross up with the site" : "Move the map to the spot"}
            <button type="button" className={s.hintCancel} onClick={() => setPlacing(false)}>Cancel</button>
            <button type="button" className={s.hintMain} onClick={placeHere}>Place pin here</button>
          </p>
        </>
      ) : (wide || snap === "peek") && (
        // Phones: just above the sheet at its bar. Pulled up, the sheet covers the map, so no bar.
        <DrawBar draw={draw} onAdd={newArea} plants={areaPlants} shown={shownArea} place={placeSite ? (parcel ? `${placeName} · ${partName}` : placeName) : undefined} onChangePlace={changeSite} style={wide ? undefined : { bottom: SHEET_HEIGHT.peek + 12 }} />
      )}
      <FormPanel wide={wide} open container={screen} snap={snap} onSnap={snapTo} label="New planting event" title={where.title} subtitle={where.sub} onTitle={changeSite}>
        {overview && (place
          ? <PlaceOverview slug={place} parcelId={parcel} partName={parcel ? partName : undefined} onStart={() => setStarted(true)} onBack={() => setPicked({ slug: "", parcelId: null })} />
          : <SiteIndex sites={options.sites} totals={totals} onChoose={(slug) => chooseSite(slug, null)} onStart={() => setStarted(true)} />)}
        <MapEventForm
          key={formKey} hidden={overview} options={options} today={today} initialPlace={initialSite} picked={picked} onChooseSite={changeSite}
          suggestions={suggestions[place] ?? []} onStepChange={onStepChange} onPlaceChange={onPlaceChange}
          spot={spot} spotNear={spotNear} onAddSpot={startPlacing} onRemoveSpot={removeSpot} spotInfo={spotInfo} onSpotInfo={setSpotInfo} totals={totals}
          pinMoved={isMoved(place, parcel)} onMovePin={startMoving} onUndoPin={undoMove}
          areas={draw.areas} onDrawArea={newArea} onAreaPlants={setAreaPlants} onAreaFocus={setShownArea} onReset={() => { draw.clear(); setAreaAt(null); }}
          // A mini map of the place: always on desktop, and on phones when the sheet is full screen (covering the big map).
          plantedArea={focus && (wide || snap === "full") ? <MiniMap at={focus} areas={draw.areas.map((a) => a.pts)} label={where.title} sub={where.sub} isNew={!!spot} onOpen={wide ? undefined : showMap} /> : undefined}
        />
      </FormPanel>
      <ConfirmDialog
        open={!!pendingMove} title={`Move the pin for ${partName && partName !== "The site as a whole" ? `${placeName} · ${partName}` : placeName}?`}
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
        This planting event is at {placeName}, and an event is at one site. Starting a new event at {areaElsewhere?.pin.label} clears what you&apos;ve entered here and keeps this area.
      </ConfirmDialog>
      <ConfirmDialog
        open={!!leaving} title="Leave this planting event?" confirmLabel="Leave event" cancelLabel="Keep editing"
        onConfirm={() => leaving && leaveFor(leaving)} onCancel={() => setLeaving(null)}
      >
        It isn&apos;t finished. What you&apos;ve entered will be cleared, and you&apos;ll see {leaving?.label} instead.
      </ConfirmDialog>
      <SiteChooser open={choosing} sites={options.sites} totals={totals} value={{ slug: place, parcelId: parcel }} onChoose={chooseSite} onClose={() => setChoosing(false)} />
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
    () => true,
  );
}
