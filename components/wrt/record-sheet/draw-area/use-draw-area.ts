"use client";
/**
 * Drawing the planted area on the record sheet's map, two ways:
 *   corners  tap each corner; the first one pulses once you can close the shape
 *   trace    run a finger round the edge in one go; it's tidied into a few corners
 * Either way, once closed: drag a corner, or a + between two, to fix it. Done keeps it as the
 * event's planted area (not saved yet). The map still pans and zooms while drawing; while tracing,
 * one finger draws and two zoom.
 */
import type * as maplibregl from "maplibre-gl";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { simplifyTrace, type LngLat } from "@/lib/wrt/areas/planted-area";

export type DrawMethod = "corners" | "trace";
export interface Shape { pts: LngLat[]; closed: boolean }

const EMPTY: Shape = { pts: [], closed: false };
/** A tap this close to the first corner (in px) closes the shape. */
export const CLOSE_PX = 18;
/** Trace points closer than this (in px) are skipped. */
const TRACE_STEP_PX = 3;

export function useDrawArea(map: RefObject<maplibregl.Map | null>) {
  const [method, setMethod] = useState<DrawMethod | null>(null);
  const [shape, setShapeState] = useState<Shape>(EMPTY);
  // Earlier shapes, for Undo. A ref, so Undo reads it directly; `steps` re-renders the button.
  const history = useRef<Shape[]>([]);
  const [steps, setSteps] = useState(0);
  const setHistory = useCallback((h: Shape[]) => { history.current = h; setSteps(h.length); }, []);
  /** The line being traced, while the finger is down. */
  const [trace, setTrace] = useState<LngLat[] | null>(null);
  /** The pointer on desktop, for the dashed line to the next corner. */
  const [cursor, setCursor] = useState<LngLat | null>(null);
  /** The planted area kept with Done. */
  const [area, setArea] = useState<LngLat[] | null>(null);

  // Map listeners read the latest shape without being re-added on every change.
  const now = useRef(shape);
  const setShape = useCallback((next: Shape) => { now.current = next; setShapeState(next); }, []);
  /** Change the shape, keeping the old one for Undo. */
  const commit = useCallback((next: Shape) => {
    setHistory([...history.current.slice(-59), now.current]);
    setShape(next);
  }, [setShape, setHistory]);

  const undo = useCallback(() => {
    const h = history.current;
    if (!h.length) return;
    setShape(h[h.length - 1]);
    setHistory(h.slice(0, -1));
  }, [setShape, setHistory]);

  /** Start drawing: a new area, or (with `from`) fixing the kept one. */
  const start = useCallback((how: DrawMethod, from: LngLat[] | null = null) => {
    setMethod(how);
    setShape(from ? { pts: from, closed: true } : EMPTY);
    setHistory([]);
    setTrace(null);
  }, [setShape, setHistory]);

  /** Switch method before anything is drawn. */
  const switchTo = useCallback((how: DrawMethod) => { setMethod(how); setShape(EMPTY); setHistory([]); }, [setShape, setHistory]);
  const cancel = useCallback(() => { setMethod(null); setShape(EMPTY); setTrace(null); setCursor(null); }, [setShape]);
  /** Clear the shape and draw it again (Undo brings it back). */
  const redraw = useCallback(() => commit(EMPTY), [commit]);
  const close = useCallback(() => {
    if (now.current.pts.length >= 3 && !now.current.closed) commit({ ...now.current, closed: true });
  }, [commit]);
  const done = useCallback(() => {
    if (now.current.pts.length < 3) return;
    setArea(now.current.pts);
    cancel();
  }, [cancel]);

  // Corners: a tap on the map adds one, or closes the shape near the first.
  useEffect(() => {
    const m = map.current;
    if (!m || method !== "corners" || shape.closed) return;
    m.doubleClickZoom.disable(); // two quick taps are two corners
    m.getCanvas().style.cursor = "crosshair";
    const onClick = (e: maplibregl.MapMouseEvent) => {
      const { pts } = now.current;
      const first = pts[0] && m.project(pts[0]);
      if (pts.length >= 3 && first && Math.hypot(first.x - e.point.x, first.y - e.point.y) < CLOSE_PX) return close();
      commit({ pts: [...pts, [e.lngLat.lng, e.lngLat.lat]], closed: false });
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
  }, [map, method, shape.closed, close, commit]);

  // Trace: one finger (or the mouse) draws instead of panning; a second finger stops it, to zoom.
  useEffect(() => {
    const m = map.current;
    if (!m || method !== "trace" || shape.closed) return;
    const box = m.getCanvasContainer();
    m.dragPan.disable();
    m.getCanvas().style.cursor = "crosshair";
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
      if (corners.length >= 3) commit({ pts: corners, closed: true });
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
      setTrace(null);
    };
  }, [map, method, shape.closed, commit]);

  // Keys on desktop: ⌘Z (or Backspace) undoes, Enter is Done, Esc stops drawing.
  useEffect(() => {
    if (!method) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable]")) return;
      if ((e.key === "z" && (e.metaKey || e.ctrlKey)) || e.key === "Backspace") { e.preventDefault(); undo(); }
      else if (e.key === "Enter") { e.preventDefault(); done(); }
      else if (e.key === "Escape") cancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [method, undo, done, cancel]);

  return {
    method, shape, trace, cursor, area, canUndo: steps > 0,
    start, switchTo, undo, close, redraw, done, cancel, removeArea: () => setArea(null),
    /** Before dragging a corner: keep the shape for Undo. */
    grab: () => commit(now.current),
    /** Move corner `i` (no Undo step: grab took it). */
    moveCorner: (i: number, at: LngLat) => setShape({ ...now.current, pts: now.current.pts.map((p, j) => (j === i ? at : p)) }),
    /** Add a corner after corner `i`, at `at`, ready to drag. */
    addCorner: (i: number, at: LngLat) => commit({ ...now.current, pts: [...now.current.pts.slice(0, i + 1), at, ...now.current.pts.slice(i + 1)] }),
  };
}

export type DrawArea = ReturnType<typeof useDrawArea>;
