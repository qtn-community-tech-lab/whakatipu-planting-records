"use client";
/**
 * The record sheet: a full-screen satellite map with a pin for every site,
 * and the planting-event form over it (on the right on wide screens, in a
 * bottom drawer on phones). Clicking a pin chooses that site in the form;
 * choosing a site in the form highlights its pin and flies there.
 *
 * This file only wires the parts together:
 *   geometry.ts / layout.ts   the maths: bounds, padding, snaps
 *   sites.ts                  the pins, from data/site-locations.json
 *   map-scene.ts              MapLibre: the map and the pins
 *   use-record-map.ts         the fly-in, and showing the chosen site
 *   top-bar                   the pill at the top left
 * The form sits in the shared FormPanel (components/wrt/shared/form-panel).
 */
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { MapEventForm } from "@/components/wrt/events/map-event-form";
import type { EventFormOptions } from "@/lib/wrt/events/form-options";
import type { SpeciesSuggestion } from "@/lib/wrt/events/site-suggestions";
import { STEP } from "@/lib/wrt/events/steps";
import { FormPanel, MID, PEEK, TALL, type Snap } from "@/components/wrt/shared/form-panel";
import type { LngLat } from "./geometry";
import { nearestSite, sitePins } from "./sites";
import { TopBar } from "./top-bar";
import { showSite, useDropPin, useMapPadding, useRecordMap, useSpotMarker } from "./use-record-map";
import s from "./record-sheet.module.css";

const WIDE = "(min-width: 768px)";

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
}

export function RecordSheet({ initialSite, options, today, exitHref, suggestions }: RecordSheetProps) {
  const wide = useMedia(WIDE);
  const mapEl = useRef<HTMLDivElement>(null);
  const [screen, setScreen] = useState<HTMLDivElement | null>(null);
  const [snap, setSnap] = useState<Snap>(MID);
  const [pins] = useState(() => sitePins(options.sites));
  // A pin clicked on the map (a new object each click, so clicking the same pin again still counts);
  // the form takes it up and reports its choice back as `place`.
  const [picked, setPicked] = useState<{ slug: string } | null>(null);
  const [place, setPlace] = useState(initialSite);
  const placeName = options.sites.find((x) => x.slug === place)?.name ?? "Choose a site";

  const { map, phase } = useRecordMap({ pins, initialSite, container: mapEl, pinClass: s.pin, wideQuery: WIDE, onPick: (slug) => setPicked({ slug }) });
  const open = phase === "open";

  // A new location: tap the map to drop it; the nearest site is chosen for it.
  const [placing, setPlacing] = useState(false);
  const [spot, setSpot] = useState<LngLat | null>(null);
  const startPlacing = useCallback(() => {
    setPlacing(true);
    setSnap(PEEK); // phones: drop the drawer out of the way
  }, []);
  const stopPlacing = () => {
    setPlacing(false);
    setSnap(MID);
  };
  const onDrop = useCallback((at: LngLat) => {
    setSpot(at);
    setPlacing(false);
    setSnap(MID);
    const near = nearestSite(pins, at);
    if (near) setPicked({ slug: near });
  }, [pins]);
  useDropPin(map, placing, onDrop);
  useSpotMarker(map, spot, s.spot);
  useMapPadding(map, open, wide, snap, spot);

  const onPlaceChange = useCallback((placeSlug: string, parcelId: string | null) => {
    setPlace(placeSlug);
    showSite(map, placeSlug, parcelId, spot);
  }, [map, spot]);

  const onStepChange = useCallback((step: number) => {
    // The species list needs the room: raise the phone drawer for it.
    if (step === STEP.whatPlanted) setSnap(TALL);
  }, []);

  return (
    <div ref={setScreen} className={s.screen}>
      <div ref={mapEl} className={s.map} />
      <TopBar siteName={placeName} exitHref={exitHref} />
      {placing ? (
        <p className={s.hint} role="status">
          Tap the map where you planted
          <button type="button" onClick={stopPlacing}>Cancel</button>
        </p>
      ) : open && (
        <div className={s.tools}>
          <button type="button" className={s.tool} onClick={startPlacing}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><path d="M12 7v5M9.5 9.5h5" /></svg>
            New location
          </button>
          <button type="button" className={s.tool} disabled title="Drawing the planted area comes in the next PR">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 6l9-2 5 9-7 7-8-5z" /></svg>
            Draw area <span className={s.soon}>Next</span>
          </button>
        </div>
      )}
      <FormPanel wide={wide} open={open} container={screen} snap={snap} onSnap={setSnap} eyebrow="New planting event" title={`New planting event at ${placeName}`}>
        <MapEventForm
          options={options} today={today} initialPlace={initialSite} picked={picked}
          suggestions={suggestions[place] ?? []} onStepChange={onStepChange} onPlaceChange={onPlaceChange}
          spot={spot} onAddSpot={startPlacing} onRemoveSpot={() => setSpot(null)}
        />
      </FormPanel>
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
