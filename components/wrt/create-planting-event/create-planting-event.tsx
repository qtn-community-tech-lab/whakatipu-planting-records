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
 * Shared pieces: FormPanel (the form's panel), MiniMap and FigureList (components/wrt/shared).
 */
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
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
import { highlightSite, mapCentre, useCamera, usePlantingMap, useSpotMarker } from "./use-planting-map";
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
    setChoosing(false);
    setPicked({ slug, parcelId });
    setSnap((at) => (at === "peek" ? "mid" : at));
  }

  // A tapped site first shows what's been planted there; "Add new planting event" opens the form.
  const [started, setStarted] = useState(false);
  const [leaving, setLeaving] = useState<SitePin | null>(null);
  const [formKey, setFormKey] = useState(0);

  const map = usePlantingMap({ pins, initialSite, container: mapEl, pinClass: s.pin ?? "", wideQuery: WIDE, onPick: pickPin });

  // A pin chooses its site (and part, for a part's own pin) and brings the phone sheet up halfway.
  function pickPin(pin: SitePin) {
    // Mid-event, another site's pin asks first: the event isn't finished.
    if (started && pin.slug !== place) return setLeaving(pin);
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
  function removeSpot() {
    setSpot(null);
    setSpotNear(null);
    setSpotInfo({ name: "", asPart: false });
  }
  // A fresh form (new key) at the other site, back on its overview.
  function leaveFor(pin: SitePin) {
    setLeaving(null);
    setStarted(false);
    removeSpot();
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
  const startPlacing = useCallback(() => {
    setStarted(true);
    setPlacing("new");
    setSnap("peek"); // the map has to show, like Draw area
  }, []);
  // The same cross moves a site's pin: the map is already centred on it.
  const startMoving = useCallback(() => {
    setPlacing("move");
    setSnap("peek");
  }, []);
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
  // "Draw area", for now: drop the phone sheet so the map shows. Drawing comes in the next PR.
  const showMap = () => setSnap("peek");

  // The cross sits where the map's centre is: the middle of the padding the form leaves.
  const pad = paddingFor(wide, snap, screen?.clientHeight ?? 0);
  const cross = screen && {
    left: pad.left + (screen.clientWidth - pad.left - pad.right) / 2,
    top: pad.top + (screen.clientHeight - pad.top - pad.bottom) / 2,
  };
  useSpotMarker(map, spot, NEW_PIN_CLASS);
  useCamera(map, wide, snap, focus, pins);

  const onPlaceChange = useCallback((placeSlug: string, parcelId: string | null) => {
    setPlace(placeSlug);
    setParcel(parcelId);
    highlightSite(map, placeSlug);
    setFocus(spot ?? pinAt(placeSlug, parcelId));
  }, [map, spot, pinAt]);

  const onStepChange = useCallback((step: number) => {
    // The species list needs the room: take the phone sheet full screen for it.
    if (step === STEP.whatPlanted) setSnap("full");
  }, []);

  return (
    <div ref={setScreen} className={s.screen}>
      <div ref={mapEl} className={s.map} />
      <TopBar siteName={spot || placeSite ? where.title : undefined} exitHref={exitHref} onChooseSite={changeSite} onAddLocation={startPlacing} onDrawArea={showMap} />
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
      ) : null}
      <FormPanel wide={wide} open container={screen} snap={snap} onSnap={setSnap} label="New planting event" title={where.title} subtitle={where.sub} onTitle={changeSite}>
        {overview && (place
          ? <PlaceOverview slug={place} parcelId={parcel} partName={parcel ? partName : undefined} onStart={() => setStarted(true)} onBack={() => setPicked({ slug: "", parcelId: null })} pinMoved={isMoved(place, parcel)} onMovePin={startMoving} onUndoPin={undoMove} />
          : <SiteIndex sites={options.sites} totals={totals} onChoose={(slug) => chooseSite(slug, null)} onStart={() => setStarted(true)} />)}
        <MapEventForm
          key={formKey} hidden={overview} options={options} today={today} initialSite={initialSite} picked={picked} onChooseSite={changeSite}
          suggestions={suggestions[place] ?? []} onStepChange={onStepChange} onSiteChange={onPlaceChange}
          spot={spot} spotNear={spotNear} onAddSpot={startPlacing} onRemoveSpot={removeSpot} spotInfo={spotInfo} onSpotInfo={setSpotInfo}
          pinMoved={isMoved(place, parcel)}
          // A mini map of the place: always on desktop, and on phones when the sheet is full screen (covering the big map).
          plantedArea={focus && (wide || snap === "full") ? <MiniMap at={focus} label={where.title} sub={where.sub} isNew={!!spot} onOpen={wide ? undefined : showMap} /> : undefined}
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
