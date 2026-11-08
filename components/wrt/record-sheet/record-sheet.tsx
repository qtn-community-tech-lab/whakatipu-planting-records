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
 *   top-bar             back, the site, and the + menu
 *   site-chooser        the sites-and-parts dialog
 *   mini-map            the still map shown in the full-screen form
 * The form sits in the shared FormPanel (components/wrt/shared/form-panel).
 */
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { MapEventForm, type SpotInfo } from "@/components/wrt/events/map-event-form";
import type { EventFormOptions } from "@/lib/wrt/events/form-options";
import type { SpeciesSuggestion } from "@/lib/wrt/events/site-suggestions";
import { STEP } from "@/lib/wrt/events/steps";
import { FormPanel, SHEET_HEIGHT, type Snap } from "@/components/wrt/shared/form-panel";
import { paddingFor } from "./layout";
import { nearestPin, pinFor, sitePins, type LngLat, type SitePin } from "./sites";
import { MiniMap } from "./mini-map";
import { SiteChooser } from "./site-chooser";
import { TopBar } from "./top-bar";
import { highlightSite, mapCentre, useCamera, useRecordMap, useSpotMarker } from "./use-record-map";
import s from "./record-sheet.module.css";

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
  totals: Record<string, { plants: number; species: number }>;
}

export function RecordSheet({ initialSite, options, today, exitHref, suggestions, totals }: RecordSheetProps) {
  const wide = useMedia(WIDE);
  const mapEl = useRef<HTMLDivElement>(null);
  const [screen, setScreen] = useState<HTMLDivElement | null>(null);
  // Phones start with the sheet at its bar, so the map shows first.
  const [snap, setSnap] = useState<Snap>("peek");
  const [pins] = useState(() => sitePins(options.sites, totals));
  // A pin clicked on the map (a new object each click, so clicking the same pin again still counts);
  // the form takes it up and reports its choice back as `place`.
  const [picked, setPicked] = useState<{ slug: string; parcelId: string | null } | null>(null);
  const [place, setPlace] = useState(initialSite);
  const [parcel, setParcel] = useState<string | null>(null);
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

  const map = useRecordMap({ pins, initialSite, container: mapEl, pinClass: s.pin, wideQuery: WIDE, onPick: pickPin });

  // A pin chooses its site (and part, for a part's own pin) and brings the phone sheet up halfway.
  function pickPin(pin: SitePin) {
    setPicked({ slug: pin.slug, parcelId: pin.parcelId });
    setSnap("mid");
  }

  // A new location: a cross sits in the middle of the map you can see (above the phone sheet,
  // beside the desktop panel); move the map under it and place the pin. The nearest site is chosen.
  const [placing, setPlacing] = useState(false);
  const [spot, setSpot] = useState<LngLat | null>(null);
  // The pin nearest the new location: within NEAR_KM it fills in the site (and part); further, the form asks.
  const [spotNear, setSpotNear] = useState<{ label: string; km: number; matched: boolean } | null>(null);
  // The new location's name, and whether it's a new part of the site or just a pin for it. Not saved yet.
  const [spotInfo, setSpotInfo] = useState<SpotInfo>({ name: "", asPart: false });
  function removeSpot() {
    setSpot(null);
    setSpotNear(null);
    setSpotInfo({ name: "", asPart: false });
  }
  // What the header, the title and the mini map call this place. While a new location is being
  // added, that's what it is: never just the site's name, so it can't be mistaken for the site itself.
  const where = spot
    ? { title: spotInfo.name.trim() || "New location", sub: !placeSite ? "Not at a known site yet" : `${spotInfo.asPart ? "New part of" : "A pin for"} ${placeSite.name}` }
    : { title: placeName, sub: partName };
  const startPlacing = useCallback(() => {
    setPlacing(true);
    setSnap("peek"); // the map has to show, like Draw area
  }, []);
  function placeHere() {
    const at = mapCentre(map);
    setPlacing(false);
    if (!at) return;
    setSpot(at);
    setSnap("mid"); // up again, to name it
    const near = nearestPin(pins, at);
    const matched = !!near && near.km <= NEAR_KM;
    setSpotNear(near && { label: near.pin.label, km: near.km, matched });
    if (matched) setPicked({ slug: near.pin.slug, parcelId: near.pin.parcelId });
    else setChoosing(true); // not at a known site: say which it belongs to
  }
  // "Draw area", for now: drop the phone sheet so the map shows. Drawing comes in the next PR.
  const showMap = () => setSnap("peek");

  // The cross sits where the map's centre is: the middle of the padding the form leaves.
  const pad = paddingFor(wide, snap);
  const cross = screen && {
    left: pad.left + (screen.clientWidth - pad.left - pad.right) / 2,
    top: pad.top + (screen.clientHeight - pad.top - pad.bottom) / 2,
  };
  useSpotMarker(map, spot, s.spot);
  // What the camera centres: the new location if there is one, else the chosen site's (part's) pin.
  const [focus, setFocus] = useState<LngLat | null>(null);
  useCamera(map, wide, snap, focus);

  const onPlaceChange = useCallback((placeSlug: string, parcelId: string | null) => {
    setPlace(placeSlug);
    setParcel(parcelId);
    highlightSite(map, placeSlug);
    setFocus(spot ?? pinFor(placeSlug, parcelId));
  }, [map, spot]);

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
            Move the map to the spot
            <button type="button" className={s.hintCancel} onClick={() => setPlacing(false)}>Cancel</button>
            <button type="button" className={s.hintMain} onClick={placeHere}>Place pin here</button>
          </p>
        </>
      ) : null}
      <FormPanel wide={wide} open container={screen} snap={snap} onSnap={setSnap} eyebrow="New planting event" title={where.title} subtitle={where.sub} onTitle={changeSite}>
        <MapEventForm
          options={options} today={today} initialPlace={initialSite} picked={picked} onChooseSite={changeSite}
          suggestions={suggestions[place] ?? []} onStepChange={onStepChange} onPlaceChange={onPlaceChange}
          spot={spot} spotNear={spotNear} onAddSpot={startPlacing} onRemoveSpot={removeSpot} spotInfo={spotInfo} onSpotInfo={setSpotInfo} totals={totals}
          // Only when the phone sheet is full screen, covering the big map, does the form show a mini map.
          plantedArea={focus && !wide && snap === "full" ? <MiniMap at={focus} label={where.title} sub={where.sub} isSpot={!!spot} onOpen={showMap} /> : undefined}
        />
      </FormPanel>
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
