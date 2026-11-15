"use client";
/**
 * A new location: a cross sits in the middle of the map you can see (above the phone sheet,
 * beside the desktop panel); move the map under it and place the pin. The nearest site is chosen.
 * The same cross moves a site's pin when it's in the wrong spot (asked first: it changes more than this event).
 * Where the cross is up from, and what Cancel goes back to, is the page's state (see planting-page.ts).
 */
import type * as maplibregl from "maplibre-gl";
import { useEffect, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { SpotInfo } from "../form/map-event-form";
import { fromPin, kmLabel } from "@/lib/wrt/text";
import { kmBetween, kmToNearest, nearestPin, type LngLat, type SitePin } from "./sites";
import { mapCentre } from "./use-planting-map";
import type { Cross, CrossMode, PageAction } from "../planting-page";

/** The pin nearest the new location: within NEAR_KM it fills in the site (and part); further, the form asks. */
export type SpotNear = { label: string; km: number; matched: boolean };

export function useCross(p: {
  map: RefObject<maplibregl.Map | null>;
  cross: Cross | undefined;
  dispatch: Dispatch<PageAction>;
  wide: boolean;
  unlessEditing: (run: () => void) => void;
  afterSave: () => void;
  stopDraw: () => void;
  siteSlug: string;
  part: string | null;
  /** The chosen site is one we know (or kept): with none, the new location is a new site. */
  atSite: boolean;
  sites: { slug: string; name: string }[];
  pins: SitePin[];
  pinAt: (slug: string, partId: string | null) => LngLat | null;
  pinsOf: (slug: string) => LngLat[];
  move: (slug: string, partId: string | null, to: LngLat | null) => void;
  setFocus: (at: LngLat) => void;
  spot: LngLat | null;
  setSpot: (at: LngLat) => void;
  setSpotNear: (near: SpotNear | null) => void;
  setSpotInfo: Dispatch<SetStateAction<SpotInfo>>;
  setPicked: (to: { slug: string; partId: string | null }) => void;
  /** Chooses a site; `ask`: entries at another site ask first. */
  moveTo: (slug: string, partId: string | null, ask?: boolean) => void;
  nearKm: number;
}) {
  const { map, cross, dispatch, siteSlug, part, pinAt, setFocus } = p;
  const placing = cross?.mode ?? false;
  const crossFrom = cross?.from;

  function startCross(mode: CrossMode, partSite = "") {
    p.unlessEditing(() => {
      if (mode !== "spot" && mode !== "move") p.afterSave();
      p.stopDraw();
      // Where the cross starts, and what the hint measures from: the site a new location or sublocation is for,
      // the new location being moved (measured from its site), the pin being moved. A new site starts where the map is.
      const forSite = mode === "part" ? partSite : mode === "new" || mode === "spot" ? siteSlug : "";
      const moving = pinAt(siteSlug, part);
      const start = mode === "spot" ? p.spot : mode === "part" ? pinAt(partSite, null) : mode === "new" ? moving : null;
      if (start) setFocus([start[0], start[1]]);
      const from = mode === "move" ? moving && { pins: [moving], label: "" } : forSite ? { pins: p.pinsOf(forSite), label: p.sites.find((x) => x.slug === forSite)?.name ?? "" } : null;
      dispatch({ type: "startCross", mode, partOf: partSite, from });
    });
  }

  // How far the cross is from where it's measured (see startCross), as the map moves; one reading a frame.
  const [crossKm, setCrossKm] = useState<number | null>(null);
  useEffect(() => {
    const m = map.current;
    if (!placing || !crossFrom || !m) return;
    let frame = 0;
    const onMove = () => {
      frame ||= requestAnimationFrame(() => { frame = 0; const c = mapCentre(map); setCrossKm(c && kmToNearest(crossFrom.pins, c)); });
    };
    onMove();
    m.on("move", onMove);
    return () => { m.off("move", onMove); cancelAnimationFrame(frame); };
  }, [placing, crossFrom, map]);
  const crossDistance = !crossFrom || crossKm === null ? "" : placing === "move" ? ` · moved ${kmLabel(crossKm)}` : ` · ${fromPin(crossKm, crossFrom.label)}`;
  useEffect(() => {
    if (!placing) return;
    // Not while a dialog is open (its own Esc closes it).
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.querySelector('[role="alertdialog"]')) dispatch({ type: "cancelCross" }); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [placing, dispatch]);

  // Moving a site's pin changes more than this event, so it's asked first (saying how far it moves).
  const [pendingMove, setPendingMove] = useState<LngLat | null>(null);
  const movedFrom = pendingMove && pinAt(siteSlug, part);
  const movedBy = pendingMove && movedFrom ? kmBetween(movedFrom, pendingMove) : null;
  function movePin(at: LngLat) {
    setPendingMove(null);
    dispatch({ type: "endCross" });
    p.move(siteSlug, part, at);
    setFocus(at);
  }
  function dropPinHere() {
    const at = mapCentre(map);
    if (!at || !cross) return;
    if (placing === "move") return setPendingMove(at);
    const near = placing === "part" ? null : nearestPin(p.pins, at);
    const matched = placing === "new" && !!near && near.km <= p.nearKm;
    dispatch({ type: "drop", hasSpot: !!p.spot, slug: siteSlug, part, toList: placing === "new" && !matched, wide: p.wide });
    p.setSpot(at);
    // The new location moved: nothing else changes (its distance is to the same pin).
    if (placing === "spot") {
      setFocus(at);
      // A new site: the nearest known pin again (is it now right by one?). At a site, its pin's distance is worked out live.
      if (!p.atSite) p.setSpotNear(near && { label: near.pin.label, km: near.km, matched: false });
      return;
    }
    // A sublocation of the site it was asked for, however near another; its name, if typed, kept.
    if (placing === "part") {
      p.setSpotNear(null); // its distance is to its site (spotKm)
      p.setSpotInfo((i) => ({ ...i, asPart: true, decided: true }));
      return p.setPicked({ slug: cross.partOf, partId: null });
    }
    // A new site is at no site we know, as "Keep it as a new site" leaves it (with entries at a site, asked first).
    if (placing === "site") {
      p.setSpotNear(near && { label: near.pin.label, km: near.km, matched: false });
      p.setSpotInfo((i) => ({ ...i, asPart: false, decided: true }));
      return p.moveTo("", null, true);
    }
    p.setSpotNear(near && { label: near.pin.label, km: near.km, matched });
    p.setSpotInfo((i) => ({ ...i, asPart: false, decided: false }));
    // Near another site than an event's with entries: the same question as choosing it.
    // Not at a known site, the site list opened (with the drop) to say which it belongs to.
    if (matched) p.moveTo(near.pin.slug, near.pin.partId, true);
  }

  return { startCross, cancelCross: () => dispatch({ type: "cancelCross" }), dropPinHere, crossDistance, pendingMove, setPendingMove, movePin, movedBy };
}
