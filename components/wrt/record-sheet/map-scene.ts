/**
 * The record sheet's map: satellite imagery and a pin for every site.
 * Everything that touches MapLibre directly lives here; the maths is in geometry.ts.
 */
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LngLat } from "./geometry";
import type { SitePin } from "./sites";

// Same worker setup as components/ui/map.tsx.
if (typeof window !== "undefined" && !maplibregl.getWorkerUrl()) {
  maplibregl.setWorkerUrl(`https://unpkg.com/maplibre-gl@${maplibregl.getVersion()}/dist/maplibre-gl-worker.mjs`);
}

const IMAGERY = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export function createMap(container: HTMLElement, start: LngLat): maplibregl.Map {
  return new maplibregl.Map({
    container,
    style: {
      version: 8,
      sources: {
        imagery: { type: "raster", tiles: [IMAGERY], tileSize: 256, maxzoom: 19, attribution: "Esri, Maxar, Earthstar Geographics" },
      },
      layers: [{ id: "imagery", type: "raster", source: "imagery" }],
    },
    center: start,
    zoom: 10,
    attributionControl: { compact: false },
    dragRotate: false,
    pitchWithRotate: false,
  });
}

/** A site's pin: a real button, so it can be reached and chosen from the keyboard too. */
export function pinMarker(pin: SitePin, className: string, onPick: (pin: SitePin) => void) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = className;
  el.dataset.site = pin.slug;
  el.setAttribute("aria-label", `Choose ${pin.label}`);
  el.title = pin.label;
  el.addEventListener("click", () => onPick(pin));
  return new maplibregl.Marker({ element: el }).setLngLat(pin.at);
}

/** A new location dropped on the map (not a site yet), styled by `className`. */
export function spotMarker(at: LngLat, className: string) {
  const el = document.createElement("div");
  el.className = className;
  return new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat(at);
}
