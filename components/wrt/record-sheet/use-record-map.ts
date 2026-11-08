"use client";
/**
 * The map's choreography: fly in to the starting site (or fit every site's
 * pin), then report that the form can open. Pins pick a site; showSite
 * highlights the chosen one and flies to it.
 */
import type * as maplibregl from "maplibre-gl";
import { useEffect, useRef, useState, type RefObject } from "react";
import { bezier, boundsOf, centreOf } from "./geometry";
import { MID, type Snap } from "@/components/wrt/shared/form-panel";
import { paddingFor, withMargin } from "./layout";
import { createMap, pinMarker } from "./map-scene";
import { pinFor, type SitePin } from "./sites";

/** flying → open (the form comes up). */
export type Phase = "flying" | "open";

const FLY_DELAY = 350;
const FLY = 2400;
/** The pins land this far into the flight; the form opens once the camera has landed
    (re-centring it earlier would cancel the flight part-way). */
const PINS_AT = 0.62;
const OPEN_AT = FLY_DELAY + FLY + 120;
/** How close to fly in on a chosen site. */
const SITE_ZOOM = 16;

export function useRecordMap({ pins, initialSite, container, pinClass, wideQuery, onPick }: {
  pins: SitePin[];
  /** Site slug to fly in to, or "" to show every site. */
  initialSite: string;
  container: RefObject<HTMLDivElement | null>;
  pinClass: string;
  /** The media query for the side panel; read once, when the camera is aimed. */
  wideQuery: string;
  /** A pin was clicked. */
  onPick: (slug: string) => void;
}) {
  const map = useRef<maplibregl.Map | null>(null);
  const [phase, setPhase] = useState<Phase>("flying");
  // The latest handler, so clicks never call a stale one and the map isn't rebuilt when it changes.
  const pick = useRef(onPick);
  useEffect(() => { pick.current = onPick; });

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const all = pins.map((p) => p.at);
    const m = createMap(container.current!, centreOf(all));
    map.current = m;
    const markers = pins.map((p) => pinMarker(p, pinClass, (slug) => pick.current(slug)));
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

    m.on("load", () => {
      const padding = paddingFor(matchMedia(wideQuery).matches, MID);
      const start = initialSite ? pinFor(initialSite) : null;
      const fit = m.cameraForBounds(boundsOf(all), { padding: withMargin(padding, 40) });
      const camera = start
        ? { center: start, zoom: SITE_ZOOM, padding }
        : { center: centreOf(all), zoom: fit?.zoom ?? 10, padding };

      const showPins = () => markers.forEach((mk) => mk.addTo(m));
      if (reduce) {
        m.jumpTo(camera);
        showPins();
        setPhase("open");
        return;
      }
      later(FLY_DELAY, () => m.flyTo({ ...camera, duration: FLY, curve: 1.35, easing: bezier(0.45, 0, 0.12, 1), essential: true }));
      later(FLY_DELAY + FLY * PINS_AT, showPins);
      later(OPEN_AT, () => setPhase("open"));
    });

    return () => {
      timers.forEach(clearTimeout);
      m.remove();
      map.current = null;
    };
  }, [pins, initialSite, container, pinClass, wideQuery]);

  return { map, phase };
}

/** Re-centre when the form opens, moves between snaps, or switches side and bottom. */
export function useMapPadding(map: RefObject<maplibregl.Map | null>, open: boolean, wide: boolean, snap: Snap) {
  useEffect(() => {
    const m = map.current;
    if (!open || !m) return;
    // Padding only: the map keeps its centre and zoom.
    m.easeTo({ padding: paddingFor(wide, snap), duration: 500, easing: bezier(0.32, 0.72, 0, 1) });
  }, [map, open, wide, snap]);
}

/** Highlight the chosen site's pins and fly to it (or to its part's own pin). */
export function showSite(map: RefObject<maplibregl.Map | null>, siteSlug: string, parcelId: string | null) {
  const m = map.current;
  if (!m) return;
  m.getContainer().querySelectorAll<HTMLElement>("[data-site]").forEach((el) => {
    el.toggleAttribute("data-on", el.dataset.site === siteSlug);
  });
  const pin = pinFor(siteSlug, parcelId);
  if (pin) m.flyTo({ center: pin, zoom: SITE_ZOOM, duration: 1600, essential: true });
}
