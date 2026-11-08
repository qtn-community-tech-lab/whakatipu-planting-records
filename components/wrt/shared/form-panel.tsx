"use client";
/**
 * A form over a full-screen view (a map). Wide screens: a panel on the left
 * that stays open. Phones: a sheet with a bouncy spring that rests in three
 * places: "peek" (a bar at the bottom), "mid" (a preview over the map) and
 * "full" (over the map entirely, its bar now a header). Drag or flick the bar,
 * or use its button, to move between them. Place it inside a positioned
 * element and pass that element as `container`.
 */
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Spring, project, rubberBand } from "./spring";
import s from "./form-panel.module.css";

export type Snap = "peek" | "mid" | "full";
/** How much of the sheet shows at peek and mid, in px; full is the whole container. */
export const SHEET_HEIGHT = { peek: 88, mid: 560 } as const;

export function FormPanel({ wide, open, container, snap, onSnap, label, title, subtitle, onTitle, children }: {
  wide: boolean;
  open: boolean;
  /** The positioned element the phone sheet sits inside. */
  container: HTMLElement | null;
  snap: Snap;
  onSnap: (snap: Snap) => void;
  /** What the panel is, for screen readers (not shown), e.g. "New planting event". */
  label: string;
  /** What it's about, e.g. the site's name. */
  title: string;
  /** A line under the title, e.g. the part of the site. */
  subtitle?: string;
  /** Makes the title a chooser (pin, title, chevron), e.g. to change the site. */
  onTitle?: () => void;
  children: ReactNode;
}) {
  const heading = <Heading title={title} subtitle={subtitle} onTitle={onTitle} />;
  if (wide) {
    return open ? (
      <aside className={s.side} aria-label={`${label}: ${title}`}>
        <div className={s.sideHeading}>{heading}</div>
        <div className={s.scroll}>{children}</div>
      </aside>
    ) : null;
  }
  return <Sheet open={open} container={container} snap={snap} onSnap={onSnap} label={label} title={title} heading={heading}>{children}</Sheet>;
}

function Sheet({ open, container, snap, onSnap, label, title, heading, children }: {
  open: boolean; container: HTMLElement | null; snap: Snap; onSnap: (snap: Snap) => void;
  label: string; title: string; heading: ReactNode; children: ReactNode;
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

  // One spring moves the sheet.
  useEffect(() => {
    const el = sheet.current!;
    const sp = new Spring(window.innerHeight, (y) => { el.style.transform = `translate3d(0, ${y}px, 0)`; });
    spring.current = sp;
    return () => sp.stop();
  }, []);

  // The first placement is instant (no opening animation); every move after that springs.
  const placed = useRef(false);
  useEffect(() => {
    const sp = spring.current;
    if (!height || !sp) return;
    const target = open ? (snap === "full" ? 0 : Math.max(0, height - SHEET_HEIGHT[snap])) : height;
    if (placed.current) sp.to(target, fling.current);
    else sp.set(target);
    placed.current = true;
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

  // The bar's button: open from the bar, or back to the map from full screen. In between there's
  // no button: the form takes the sheet full screen itself when it needs the room, and the bar drags.
  const action = snap === "peek" ? { label: "Open", to: "mid" as const, up: true }
    : snap === "full" ? { label: "Map", to: "mid" as const, up: false } // short, so the title keeps the room
    : null;

  return (
    <section ref={sheet} className={s.sheet} data-snap={snap} aria-label={`${label}: ${title}`} hidden={!container}>
      {/* Only the part that shows is laid out, so the form's own buttons stay on screen at each snap. */}
      <div className={s.visible} style={{ height: Math.max(0, height - yFor(snap)) }}>
      <div className={s.bar} onPointerDown={onPointerDown}>
        <span className={s.handle} aria-hidden="true" />
        <span className={s.barText}>
          {heading}
        </span>
        {action && (
          <button type="button" className={s.barButton} onClick={() => onSnap(action.to)} aria-expanded={snap !== "peek"} aria-label={snap === "full" ? "Show the map" : undefined}>
            {action.up ? <ChevronUp size={16} strokeWidth={2.4} /> : <ChevronDown size={16} strokeWidth={2.4} />}
            {action.label}
          </button>
        )}
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

/** The title, as a chooser when `onTitle` is given: a pin, the title and its line, a chevron. */
function Heading({ title, subtitle, onTitle }: { title: string; subtitle?: string; onTitle?: () => void }) {
  const text = (
    <span className={s.titleText}>
      <b>{title}</b>
      {subtitle && <span>{subtitle}</span>}
    </span>
  );
  if (!onTitle) return text;
  return (
    <button type="button" className={s.titleButton} onClick={onTitle} aria-label={`${title}${subtitle ? `, ${subtitle}` : ""}: change`}>
      <span className={s.titleIcon} aria-hidden="true">
        <MapPin size={22} strokeWidth={2.2} />
      </span>
      {text}
      <ChevronDown size={22} strokeWidth={2.4} />
    </button>
  );
}
