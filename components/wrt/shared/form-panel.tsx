"use client";
/**
 * A form over a full-screen view (a map). Wide screens: a panel on the right
 * that stays open. Phones: a sheet with a bouncy spring that rests in three
 * places: "peek" (a bar at the bottom), "mid" (a preview over the map) and
 * "full" (over the map entirely, its bar now a header). Drag or flick the bar,
 * or use its button, to move between them. Place it inside a positioned
 * element and pass that element as `container`.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Spring, project, rubberBand } from "./spring";
import s from "./form-panel.module.css";

export type Snap = "peek" | "mid" | "full";
/** How much of the sheet shows at peek and mid, in px; full is the whole container. */
export const SHEET_HEIGHT = { peek: 104, mid: 560 } as const;

export function FormPanel({ wide, open, container, snap, onSnap, eyebrow, title, children }: {
  wide: boolean;
  open: boolean;
  /** The positioned element the phone sheet sits inside. */
  container: HTMLElement | null;
  snap: Snap;
  onSnap: (snap: Snap) => void;
  /** The small label at the top, e.g. "New planting event". */
  eyebrow: string;
  /** What it's about, e.g. the site's name. */
  title: string;
  children: ReactNode;
}) {
  if (wide) {
    return open ? (
      <aside className={s.side} aria-label={`${eyebrow}: ${title}`}>
        <span className={s.eyebrow}>{eyebrow}</span>
        <div className={s.scroll}>{children}</div>
      </aside>
    ) : null;
  }
  return <Sheet open={open} container={container} snap={snap} onSnap={onSnap} eyebrow={eyebrow} title={title}>{children}</Sheet>;
}

function Sheet({ open, container, snap, onSnap, eyebrow, title, children }: {
  open: boolean; container: HTMLElement | null; snap: Snap; onSnap: (snap: Snap) => void;
  eyebrow: string; title: string; children: ReactNode;
}) {
  const sheet = useRef<HTMLElement>(null);
  const spring = useRef<Spring | null>(null);
  const fling = useRef(0);
  const [height, setHeight] = useState(0);

  // The container's height decides where each snap sits.
  useEffect(() => {
    if (!container) return;
    const measure = () => setHeight(container.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [container]);

  const yFor = (at: Snap) => (at === "full" ? 0 : Math.max(0, height - SHEET_HEIGHT[at]));

  // One spring moves the sheet; it starts below the screen and springs in when the form opens.
  useEffect(() => {
    const el = sheet.current!;
    const sp = new Spring(window.innerHeight, (y) => { el.style.transform = `translate3d(0, ${y}px, 0)`; });
    spring.current = sp;
    return () => sp.stop();
  }, []);

  useEffect(() => {
    if (!height) return;
    spring.current?.to(open ? (snap === "full" ? 0 : Math.max(0, height - SHEET_HEIGHT[snap])) : height, fling.current);
    fling.current = 0;
  }, [open, snap, height]);

  // Drag the bar: the sheet follows the finger, rubber-bands past its ends, and on release goes
  // where the flick would carry it. A tap without a drag does nothing (the bar's button does).
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button") || !spring.current) return;
    const sp = spring.current;
    const bar = e.currentTarget;
    const startY = e.clientY;
    const start = sp.value;
    const samples = [{ t: e.timeStamp, y: e.clientY }];
    let dragging = false;
    bar.setPointerCapture(e.pointerId);

    const move = (ev: PointerEvent) => {
      if (!dragging && Math.abs(ev.clientY - startY) < 4) return;
      dragging = true;
      samples.push({ t: ev.timeStamp, y: ev.clientY });
      while (samples.length > 2 && ev.timeStamp - samples[0].t > 90) samples.shift();
      let y = start + ev.clientY - startY;
      const bottom = yFor("peek");
      if (y < 0) y = rubberBand(y, height);
      if (y > bottom) y = bottom + rubberBand(y - bottom, height);
      sp.set(y);
    };
    const up = (ev: PointerEvent) => {
      bar.removeEventListener("pointermove", move);
      bar.removeEventListener("pointerup", up);
      bar.removeEventListener("pointercancel", up);
      if (!dragging) return;
      const a = samples[0];
      const dt = (ev.timeStamp - a.t) / 1000;
      const velocity = dt > 0 ? (ev.clientY - a.y) / dt : 0;
      const rest = sp.value + project(velocity);
      const next = (["full", "mid", "peek"] as const).reduce((best, at) => (Math.abs(yFor(at) - rest) < Math.abs(yFor(best) - rest) ? at : best));
      fling.current = velocity;
      if (next === snap) sp.to(yFor(snap), velocity);
      else onSnap(next);
    };
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", up);
    bar.addEventListener("pointercancel", up);
  }

  // The bar's button: open the preview, go full screen, or back to the map.
  const action = snap === "peek"
    ? { label: "Open", to: "mid" as const, up: true }
    : snap === "mid"
      ? { label: "Full screen", to: "full" as const, up: true }
      : { label: "Show map", to: "mid" as const, up: false };

  return (
    <section ref={sheet} className={s.sheet} data-snap={snap} aria-label={`${eyebrow}: ${title}`} hidden={!container}>
      {/* Only the part that shows is laid out, so the form's own buttons stay on screen at each snap. */}
      <div className={s.visible} style={{ height: Math.max(0, height - yFor(snap)) }}>
      <div className={s.bar} onPointerDown={onPointerDown}>
        <span className={s.handle} aria-hidden="true" />
        <span className={s.barText}>
          <span className={s.eyebrow}>{eyebrow}</span>
          <b>{title}</b>
        </span>
        <button type="button" className={s.barButton} onClick={() => onSnap(action.to)} aria-expanded={snap !== "peek"}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d={action.up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
          </svg>
          {action.label}
        </button>
      </div>
      {/* A field focused in the preview takes the sheet full screen, above the keyboard. */}
      <div
        className={s.scroll}
        onFocusCapture={(e) => { if (snap === "mid" && (e.target as HTMLElement).matches("input, textarea")) onSnap("full"); }}
      >
        {/* Mounted once open, like the side panel, so the form starts after whatever opens it. */}
        {open && children}
      </div>
      </div>
    </section>
  );
}
