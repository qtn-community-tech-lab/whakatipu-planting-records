"use client";
/**
 * The map's choreography: fly in to the starting site (or fit every site's
 * pin), then report that the form can open. useCamera then keeps the chosen
 * site or new location centred above the form.
 */
import type * as maplibregl from "maplibre-gl";
import { useEffect, useRef, useState, type RefObject } from "react";
import { bezier, boundsOf, centreOf, type LngLat } from "./geometry";
import type { Snap } from "@/components/wrt/shared/form-panel";
import { paddingFor, withMargin } from "./layout";
import { createMap, pinMarker, spotMarker } from "./map-scene";
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
const SITE_ZOOM = 15;

export function useRecordMap({ pins, initialSite, container, pinClass, wideQuery, onPick }: {
  pins: SitePin[];
  /** Site slug to fly in to, or "" to show every site. */
  initialSite: string;
  container: RefObject<HTMLDivElement | null>;
  pinClass: string;
  /** The media query for the side panel; read once, when the camera is aimed. */
  wideQuery: string;
  /** A pin was clicked. */
  onPick: (pin: SitePin) => void;
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
    const markers = pins.map((p) => pinMarker(p, pinClass, (pin) => pick.current(pin)));
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

    m.on("load", () => {
      const padding = paddingFor(matchMedia(wideQuery).matches, "mid");
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

/**
 * The one camera move once the form is open: centre `focus` (the chosen site's pin, or a new
 * location) in the part of the map the form leaves. A new focus flies there at site zoom; the
 * sheet changing snap only shifts the padding. One move, so a sheet change never cancels a flight.
 */
export function useCamera(map: RefObject<maplibregl.Map | null>, open: boolean, wide: boolean, snap: Snap, focus: LngLat | null) {
  const last = useRef<LngLat | null>(null);
  useEffect(() => {
    const m = map.current;
    if (!open || !m) return;
    const moved = !!focus && focus !== last.current;
    last.current = focus;
    m.flyTo({
      padding: paddingFor(wide, snap),
      ...(focus ? { center: focus } : {}),
      ...(moved ? { zoom: SITE_ZOOM } : {}),
      duration: moved ? 1400 : 500, curve: 1.2, essential: true,
    });
  }, [map, open, wide, snap, focus]);
}

/** Light up the chosen site's pins. */
export function highlightSite(map: RefObject<maplibregl.Map | null>, siteSlug: string) {
  map.current?.getContainer().querySelectorAll<HTMLElement>("[data-site]").forEach((el) => {
    el.toggleAttribute("data-on", el.dataset.site === siteSlug);
  });
}

/** The map's centre: with padding set, the middle of the part the form leaves. */
export function mapCentre(map: RefObject<maplibregl.Map | null>): LngLat | null {
  const c = map.current?.getCenter();
  return c ? [c.lng, c.lat] : null;
}

/** The dropped new location's pin, kept in step with `at`. */
export function useSpotMarker(map: RefObject<maplibregl.Map | null>, at: LngLat | null, className: string) {
  useEffect(() => {
    const m = map.current;
    if (!m || !at) return;
    const marker = spotMarker(at, className).addTo(m);
    return () => { marker.remove(); };
  }, [map, at, className]);
}
