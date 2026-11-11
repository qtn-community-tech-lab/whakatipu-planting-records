"use client";
/**
 * Drawing planted areas on the record sheet's map. An event can have several.
 *
 * There is one thing being drawn at a time, the draft, or none. A draft is:
 *   method    "corners" (tap each corner) or "trace" (run a finger round the edge)
 *   pts       its corners so far
 *   closed    whether it's a shape yet
 *   editing   which kept area it replaces, or null for a new one
 * Every change to the draft goes through `change`, which keeps the old one for Undo.
 * Done adds the draft to the kept areas (or replaces the one it was editing); Stop drops it.
 * Before Done keeps it, the host may hold it (onKeep returns false), e.g. to ask something first;
 * the draft then stays open until Done(true) or Stop. Nothing is saved yet.
 */
import type * as maplibregl from "maplibre-gl";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { simplifyTrace, type LngLat } from "@/lib/wrt/areas/planted-area";

export type DrawMethod = "corners" | "trace";
export interface Draft { method: DrawMethod; pts: LngLat[]; closed: boolean; editing: number | null }
/** A kept area. `id` stays with it (plants are listed against it); its number on screen is its place in the list. */
export interface Area { id: number; pts: LngLat[] }

/** A tap this close to the first corner (in px) closes the shape. */
const CLOSE_PX = 18;
/** Trace points closer than this (in px) are skipped. */
const TRACE_STEP_PX = 3;

/** Asked before an area is kept: its corners, and how many other areas are kept. False holds it. */
export type OnKeep = (pts: LngLat[], others: number) => boolean;

export function useDrawArea(map: RefObject<maplibregl.Map | null>, onKeep?: OnKeep) {
  // The latest handler, so Done never calls a stale one.
  const keep = useRef(onKeep);
  useEffect(() => { keep.current = onKeep; });
  const [areas, setAreas] = useState<Area[]>([]);
  const nextId = useRef(1);
  const [draft, setDraftState] = useState<Draft | null>(null);
  /** The line being traced, while the finger is down. */
  const [trace, setTrace] = useState<LngLat[] | null>(null);
  /** The pointer on desktop, for the dashed line to the next corner. */
  const [cursor, setCursor] = useState<LngLat | null>(null);

  // Map listeners and Undo read these directly, so they never see a stale draft.
  const now = useRef<Draft | null>(null);
  const history = useRef<Draft[]>([]);
  const [steps, setSteps] = useState(0);
  const setDraft = useCallback((next: Draft | null, past: Draft[]) => {
    now.current = next;
    history.current = past;
    setDraftState(next);
    setSteps(past.length);
  }, []);
  /** Change the draft, keeping the old one for Undo. */
  const change = useCallback((edit: Partial<Draft>) => {
    const d = now.current;
    if (d) setDraft({ ...d, ...edit }, [...history.current.slice(-59), d]);
  }, [setDraft]);

  /** Draw a new area, or (with `editing`) change a kept one. */
  const start = useCallback((editing: number | null = null) => {
    const pts = editing === null ? [] : areas[editing]?.pts ?? [];
    setDraft({ method: "corners", pts, closed: pts.length >= 3, editing }, []);
    setTrace(null);
  }, [areas, setDraft]);
  const stop = useCallback(() => { setDraft(null, []); setTrace(null); setCursor(null); }, [setDraft]);
  const undo = useCallback(() => {
    const past = history.current;
    if (past.length) setDraft(past[past.length - 1], past.slice(0, -1));
  }, [setDraft]);
  /** Keep the draft; true if it was kept. `asked`: the host has already said yes, so don't ask it again. */
  const done = useCallback((asked = false) => {
    const d = now.current;
    if (!d || d.pts.length < 3) return false;
    const others = areas.length - (d.editing === null ? 0 : 1);
    if (!asked && keep.current?.(d.pts, others) === false) return false;
    if (d.editing === null) {
      const id = nextId.current++;
      setAreas((all) => [...all, { id, pts: d.pts }]);
    } else {
      setAreas((all) => all.map((a, i) => (i === d.editing ? { ...a, pts: d.pts } : a)));
    }
    stop();
    return true;
  }, [areas, stop]);
  /** Take a kept area off: the one being changed, or by number. */
  const remove = useCallback((i: number) => {
    setAreas((all) => all.filter((_, j) => j !== i));
    stop();
  }, [stop]);

  const method = draft?.method;
  const closed = draft?.closed ?? true;

  // Corners: a tap on the map adds one, or closes the shape near the first.
  useEffect(() => {
    const m = map.current;
    if (!m || method !== "corners" || closed) return;
    m.doubleClickZoom.disable(); // two quick taps are two corners
    m.getCanvas().style.cursor = "crosshair";
    const onClick = (e: maplibregl.MapMouseEvent) => {
      const pts = now.current?.pts ?? [];
      const first = pts[0] && m.project(pts[0]);
      if (pts.length >= 3 && first && Math.hypot(first.x - e.point.x, first.y - e.point.y) < CLOSE_PX) return change({ closed: true });
      change({ pts: [...pts, [e.lngLat.lng, e.lngLat.lat]] });
    };
    const onMove = (e: maplibregl.MapMouseEvent) => {
      if ((e.originalEvent as PointerEvent).pointerType !== "touch") setCursor([e.lngLat.lng, e.lngLat.lat]);
    };
    const onOut = () => setCursor(null);
    m.on("click", onClick);
    m.on("mousemove", onMove);
    m.on("mouseout", onOut);
    return () => {
      m.off("click", onClick);
      m.off("mousemove", onMove);
      m.off("mouseout", onOut);
      m.doubleClickZoom.enable();
      m.getCanvas().style.cursor = "";
      setCursor(null);
    };
  }, [map, method, closed, change]);

  // Trace: one finger (or the mouse) draws instead of panning; a second finger stops it, to zoom.
  useEffect(() => {
    const m = map.current;
    if (!m || method !== "trace" || closed) return;
    const box = m.getCanvasContainer();
    m.dragPan.disable();
    m.getCanvas().style.cursor = "crosshair";
    // With drag-pan off, MapLibre's CSS lets the browser scroll on one finger, which cancels the
    // trace after the first move. While tracing, the finger is ours.
    m.getCanvas().style.touchAction = box.style.touchAction = "none";
    let id: number | null = null;
    let line: { px: { x: number; y: number }; at: LngLat }[] = [];
    const point = (e: PointerEvent) => {
      const r = box.getBoundingClientRect();
      const px = { x: e.clientX - r.left, y: e.clientY - r.top };
      const at = m.unproject([px.x, px.y]);
      return { px, at: [at.lng, at.lat] as LngLat };
    };
    const down = (e: PointerEvent) => {
      if (id !== null) { id = null; line = []; setTrace(null); return; } // a second finger: zooming, not drawing
      if (e.button > 0 || (e.target as HTMLElement).closest("button")) return;
      id = e.pointerId;
      line = [point(e)];
      setTrace([line[0].at]);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const p = point(e), last = line[line.length - 1];
      if (Math.hypot(p.px.x - last.px.x, p.px.y - last.px.y) < TRACE_STEP_PX) return;
      line.push(p);
      setTrace(line.map((q) => q.at));
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      setTrace(null);
      const corners = line.length > 8 ? simplifyTrace(line.map((q) => q.px)).map((i) => line[i].at) : [];
      line = [];
      if (corners.length >= 3) change({ pts: corners, closed: true });
    };
    box.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      box.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      m.dragPan.enable();
      m.getCanvas().style.cursor = "";
      m.getCanvas().style.touchAction = box.style.touchAction = "";
      setTrace(null);
    };
  }, [map, method, closed, change]);

  // Keys on desktop: ⌘Z (or Backspace) undoes, Enter is Done, Esc stops drawing.
  useEffect(() => {
    if (!method) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable]")) return;
      if ((e.key === "z" && (e.metaKey || e.ctrlKey)) || e.key === "Backspace") { e.preventDefault(); undo(); }
      else if (e.key === "Enter") { e.preventDefault(); done(); }
      else if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [method, undo, done, stop]);

  return {
    areas, draft, trace, cursor, canUndo: steps > 0,
    start, stop, undo, done, remove, change,
    /** Before anything's drawn: switch between tapping corners and tracing. */
    pickMethod: (how: DrawMethod) => now.current && setDraft({ ...now.current, method: how }, history.current),
    /** Clear the draft's shape and draw it again (Undo brings it back). */
    startAgain: () => change({ pts: [], closed: false }),
    /** Take every area off, e.g. when leaving the event. */
    clear: () => { setAreas([]); stop(); },
    /** Take the kept areas off but go on with the draft, e.g. when it starts a new event. */
    clearKept: () => setAreas([]),
    /** Before dragging a corner: keep the shape for Undo. */
    grab: () => change({}),
    /** Move corner `i` while dragging (no Undo step: grab took it). */
    moveCorner: (i: number, at: LngLat) => {
      const d = now.current;
      if (d) setDraft({ ...d, pts: d.pts.map((p, j) => (j === i ? at : p)) }, history.current);
    },
    /** Add a corner after corner `i`, at `at`, ready to drag. */
    addCorner: (i: number, at: LngLat) => {
      const pts = now.current?.pts ?? [];
      change({ pts: [...pts.slice(0, i + 1), at, ...pts.slice(i + 1)] });
    },
  };
}

export type DrawArea = ReturnType<typeof useDrawArea>;
