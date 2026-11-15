"use client";
/**
 * The map: start on the chosen site (or every site's pin), with a pin for each
 * site. useCamera then keeps the chosen site or new location centred above the form.
 */
import type * as maplibregl from "maplibre-gl";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { Snap } from "@/components/wrt/shared/form-panel";
import { paddingFor } from "./layout";
import { groupNearbyLocations } from "@/lib/wrt/site-locations";
import { boundsOf, createMap, pinMarker } from "./map-scene";
import { pinFor, type LngLat, type SitePin } from "./sites";

const SITE_ZOOM = 15;

export function usePlantingMap({ pins, initialSite, container, pinClass, wideQuery, onPick, onTap }: {
  pins: SitePin[];
  /** Site slug to start on, or "" to show every site. */
  initialSite: string;
  container: RefObject<HTMLDivElement | null>;
  pinClass: string;
  /** The media query for the side panel; read once, when the camera is aimed. */
  wideQuery: string;
  onPick: (pin: SitePin) => void;
  /** The map itself was tapped, not a pin: where, on screen. */
  onTap?: (at: { x: number; y: number }) => void;
}) {
  const map = useRef<maplibregl.Map | null>(null);
  // The latest handler, so clicks never call a stale one and the map isn't rebuilt when it changes.
  const pick = useRef(onPick);
  const tap = useRef(onTap);
  useEffect(() => { pick.current = onPick; tap.current = onTap; });
  // The latest pins: a moved pin redraws its marker without rebuilding the map.
  const pinsNow = useRef(pins);
  const redraw = useRef<(() => void) | null>(null);
  useEffect(() => {
    pinsNow.current = pins;
    redraw.current?.();
  }, [pins]);

  // No fly-in: the map starts on the site (or every site's pin), with the sheet at its bar.
  useEffect(() => {
    const m = createMap(container.current!, boundsOf(pinsNow.current.map((p) => p.at)).getCenter());
    map.current = m;
    m.on("load", () => {
      // Before the first draw: the form chose the site before the map existed, so its highlight missed.
      m.getContainer().dataset.chosenSite = initialSite;
      m.setPadding(paddingFor(matchMedia(wideQuery).matches, "peek", m.getContainer().clientHeight));
      const start = initialSite ? pinFor(pinsNow.current, initialSite) : null;
      m.jumpTo(start ? { center: start, zoom: SITE_ZOOM } : everyPin(m, pinsNow.current));
      drawPins();
    });
    // Pins close together on screen become one marker with their total; regrouped as the map moves.
    let markers: maplibregl.Marker[] = [];
    let drawn = "";
    function drawPins() {
      const pins = pinsNow.current;
      const groups = groupNearbyLocations(pins.map((p) => m.project(p.at)));
      const key = JSON.stringify(groups);
      if (key !== drawn) {
        drawn = key;
        markers.forEach((x) => x.remove());
        markers = groups.map((g) => {
          const members = g.map((i) => pins[i]!); // groups hold indexes into pins
          return pinMarker(members, pinClass, () => {
            if (members.length === 1) return pick.current(members[0]!);
            // Fit the group, but always zoom in some: on a phone one group can already fill the screen.
            const box = boundsOf(members.map((p) => p.at));
            const fit = m.cameraForBounds(box, { padding: 40 })?.zoom ?? 0;
            m.easeTo({ center: box.getCenter(), zoom: Math.min(17, Math.max(fit, m.getZoom() + 1.5)) });
          }).addTo(m);
        });
      }
      highlightSite(map, m.getContainer().dataset.chosenSite ?? "");
    }
    m.on("click", (e) => {
      if (!(e.originalEvent.target as Element).closest(".maplibregl-marker")) tap.current?.(e.point);
    });
    m.on("moveend", drawPins);
    m.on("resize", drawPins);
    redraw.current = () => { drawn = ""; drawPins(); };
    return () => {
      redraw.current = null;
      m.remove();
      map.current = null;
    };
  }, [initialSite, container, pinClass, wideQuery]);

  return map;
}

/** Every site's pin in view. cameraForBounds adds the map's own padding (the form's space), so only a margin goes here. */
function everyPin(m: maplibregl.Map, pins: SitePin[]) {
  const all = boundsOf(pins.map((p) => p.at));
  return { center: all.getCenter(), zoom: m.cameraForBounds(all, { padding: 40 })?.zoom ?? 10 };
}

/**
 * The one camera move: centre `focus` (the chosen site's pin, or a new location) in the part of
 * the map the form leaves. A new focus flies there at site zoom; losing it (back to every site)
 * flies out to every pin; the sheet changing snap only shifts the padding (the centre stays where it is,
 * panned or not). One move, so a sheet change never cancels a flight (mid-flight, it keeps the target).
 */
export function useCamera(map: RefObject<maplibregl.Map | null>, wide: boolean, snap: Snap, focus: LngLat | null, pins: SitePin[]) {
  const last = useRef<LngLat | null>(null);
  // Our flight to the focus, until it lands: a sheet change meanwhile keeps flying there. (Not the map's own
  // motion: a drag, its glide, or an area fitted into view shouldn't pull the map back to the pin.)
  const flight = useRef(0);
  const flying = useRef(false);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const moved = focus !== last.current;
    const cleared = moved && !focus && !!last.current;
    last.current = focus;
    // Only a new focus (or our flight to it still under way) sets the centre; the padding alone (the sheet moving)
    // keeps it, so a pan the user made stays put.
    const toFocus = !!focus && (moved || flying.current);
    m.flyTo({
      padding: paddingFor(wide, snap, m.getContainer().clientHeight),
      ...(toFocus ? { center: focus } : {}),
      ...(focus && moved && (m.getZoom() < SITE_ZOOM || !m.getBounds().contains(focus)) ? { zoom: SITE_ZOOM } : {}),
      ...(cleared ? everyPin(m, pins) : {}),
      duration: moved ? 1400 : 500, curve: 1.2, essential: true,
    });
    // After flyTo: the flight it interrupted ends (moveend) inside it, and that one's handler no longer counts.
    const id = ++flight.current;
    flying.current = toFocus;
    if (toFocus) m.once("moveend", () => { if (flight.current === id) flying.current = false; });
  }, [map, wide, snap, focus, pins]);
}

/** Light up the markers holding the chosen site's pins (and remember it, for when they regroup). */
export function highlightSite(map: RefObject<maplibregl.Map | null>, siteSlug: string) {
  const box = map.current?.getContainer();
  if (!box) return;
  box.dataset.chosenSite = siteSlug;
  box.querySelectorAll<HTMLElement>("[data-site]").forEach((el) => {
    el.toggleAttribute("data-on", !!siteSlug && el.dataset.site!.split(" ").includes(siteSlug));
  });
}

/** Find me: the map flies to where you are, and a short word when it can't (no location here, or it was refused). */
export function useFindMe(map: RefObject<maplibregl.Map | null>) {
  const [said, setSaid] = useState("");
  useEffect(() => {
    if (!said) return;
    const t = setTimeout(() => setSaid(""), 4000);
    return () => clearTimeout(t);
  }, [said]);
  function findMe() {
    if (!("geolocation" in navigator)) return setSaid("This browser can't say where you are");
    setSaid("Finding you…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSaid("");
        const m = map.current;
        m?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: Math.max(m.getZoom(), 15), duration: 1500 });
      },
      (e) => setSaid(e.code === e.PERMISSION_DENIED ? "Location is turned off for this site" : "Couldn't find where you are"),
      // Without a timeout, a dismissed permission prompt would leave it finding forever.
      { timeout: 10000 },
    );
  }
  return { findMe, said };
}
