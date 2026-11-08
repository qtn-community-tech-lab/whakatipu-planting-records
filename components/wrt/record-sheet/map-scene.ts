/**
 * The record sheet's map: satellite imagery and a pin for every site.
 * Everything that touches MapLibre directly lives here.
 */
import * as maplibregl from "maplibre-gl";
// The app's map wrapper loads MapLibre's styles and sets its worker up; the mini map uses it too.
import "@/components/ui/map";
import { compactPlantCount } from "@/lib/wrt/site-locations";
import type { LngLat, SitePin } from "./sites";


/** Esri satellite imagery: the big map and the form's mini map. */
export const SATELLITE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    imagery: {
      type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256, maxzoom: 19, attribution: "Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [{ id: "imagery", type: "raster", source: "imagery" }],
};

/** The box round the points. */
export const boundsOf = (points: readonly LngLat[]) => points.reduce((b, p) => b.extend(p), new maplibregl.LngLatBounds());

export function createMap(container: HTMLElement, start: maplibregl.LngLatLike): maplibregl.Map {
  return new maplibregl.Map({
    container,
    style: SATELLITE,
    center: start,
    zoom: 10,
    attributionControl: { compact: false },
    dragRotate: false,
    pitchWithRotate: false,
  });
}

/**
 * One pin, or several close together on screen: the app's plant-count marker (as on the sites map),
 * a real button so it can be chosen from the keyboard too. The button sits inside the marker element,
 * because MapLibre positions that element and the shared marker style would override it.
 */
export function pinMarker(members: SitePin[], className: string, onClick: () => void) {
  const group = members.length > 1;
  const el = document.createElement("div");
  el.className = className;
  el.dataset.site = members.map((p) => p.slug).join(" ");
  const button = document.createElement("button");
  button.type = "button";
  button.className = `wrt-location-marker${group ? " wrt-location-marker--group" : ""}`;
  button.textContent = compactPlantCount(members.reduce((sum, p) => sum + p.plants, 0));
  if (group) {
    const places = document.createElement("span");
    places.className = "wrt-location-marker__places";
    places.textContent = `${members.length} places`;
    button.append(places);
  }
  button.setAttribute("aria-label", group ? `Zoom to ${members.length} nearby places: ${members.map((p) => p.label).join(", ")}` : `Choose ${members[0].label}`);
  button.title = members.map((p) => p.label).join(", ");
  button.addEventListener("click", onClick);
  el.append(button);
  return new maplibregl.Marker({ element: el }).setLngLat(boundsOf(members.map((p) => p.at)).getCenter());
}

/** A new location dropped on the map (not a site yet), styled by `className`. */
export function spotMarker(at: LngLat, className: string) {
  const el = document.createElement("div");
  el.className = className;
  return new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat(at);
}
