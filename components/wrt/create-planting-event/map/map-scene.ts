/**
 * The planting event page's map: satellite imagery and a pin for every site.
 * Everything that touches MapLibre directly lives here.
 */
import * as maplibregl from "maplibre-gl";
// The app's map wrapper loads MapLibre's styles and sets its worker up; the mini map uses it too.
import "@/components/ui/map";
import { compactPlantCount } from "@/lib/wrt/site-locations";
import { plantsOrNone } from "@/lib/wrt/text";
import { SATELLITE } from "@/components/wrt/shared/satellite";
import type { LngLat, SitePin } from "./sites";

/**
 * Fit a drawn area in view, with room on phones for the bar along the bottom. Only the margin goes here:
 * MapLibre adds it to the map's own padding, which already leaves out the form.
 */
export function fitArea(m: maplibregl.Map, pts: readonly LngLat[]) {
  const bottom = matchMedia("(min-width: 768px)").matches ? 40 : 170;
  m.fitBounds(boundsOf(pts), { padding: { top: 40, bottom, left: 40, right: 40 }, maxZoom: 17, duration: 800 });
}

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
    const count = document.createElement("span");
    count.className = "wrt-location-marker__places";
    count.textContent = `${members.length} locations`;
    button.append(count);
  }
  button.setAttribute("aria-label", group ? `Zoom to ${members.length} nearby locations: ${members.map((p) => p.label).join(", ")}` : `Choose ${members[0]?.label}`);
  // One line each, shown as a list by PinTooltip: a place and its plants; a group, how many, then up to four of
  // its sites (or, all at one site, its places), then how many more — a click zooms in over them all.
  const site = (p: SitePin) => p.label.split(" · ")[0]!;
  const sites = [...new Set(members.map(site))];
  const rows = sites.length > 1
    ? sites.map((s) => { const n = members.filter((p) => site(p) === s).length; return n > 1 ? `${s} · ${n} places` : s; })
    : members.map((p) => p.label.split(" · ")[1] ?? p.label);
  button.dataset.tip = !group
    ? `${members[0]?.label}\n${plantsOrNone(members[0]?.plants ?? 0)}`
    : [sites.length > 1 ? `${members.length} places at ${sites.length} sites` : `${members.length} places at ${sites[0]}`,
      ...rows.slice(0, 4), ...(rows.length > 4 ? [`and ${rows.length - 4} more · click to zoom in`] : [])].join("\n");
  button.addEventListener("click", onClick);
  el.append(button);
  return new maplibregl.Marker({ element: el }).setLngLat(boundsOf(members.map((p) => p.at)).getCenter());
}
