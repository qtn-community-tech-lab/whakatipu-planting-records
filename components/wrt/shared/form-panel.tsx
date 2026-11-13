"use client";
/**
 * A form over a full-screen view (a map). Wide screens: a panel on the left
 * that stays open. Phones: a sheet with a bouncy spring that rests in three
 * places: "peek" (a bar at the bottom), "mid" (a preview over the map) and
 * "full" (over the map, just below the status bar, its rounded top and handle
 * still showing so it reads as a sheet that can come down). Drag or flick it from
 * anywhere (at full screen, pull down from the top of the list), tap the bar at peek
 * (title and all) to open it half way, or use the bar's Map button to bring it back down. Place it inside a positioned
 * element and pass that element as `container`.
 *
 * Both are one set of elements, the form always in the same place among them, so crossing the
 * breakpoint (a window resized, a big phone turned on its side) restyles the panel but keeps the
 * form and what's typed in it. Wide, the sheet's spring and drags are off.
 */
import { ArrowLeft, ChevronDown, Map as MapIcon, MapPin, Search } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Spring, project, rubberBand } from "./spring";
import s from "./form-panel.module.css";

export type Snap = "peek" | "mid" | "full";
/** How much of the sheet shows at peek, in px. */
export const SHEET_HEIGHT = { peek: 88 } as const;
/** How much of the sheet shows at peek and mid in a container this tall; full is all of it.
    Mid is a little over half the screen (the form's first step needs the room), at most 620px. */
export const sheetHeight = (at: "peek" | "mid", containerHeight: number) =>
  at === "peek" ? SHEET_HEIGHT.peek : Math.min(620, Math.round(containerHeight * 0.58));
/** At full, the gap left above the sheet, below the status bar, in px. */
const FULL_GAP = 10;

export function FormPanel({ wide, open, container, snap, onSnap, label, title, subtitle, onTitle, titleOpen, titleMenu, titleIcon, titleHidden, onBack, backLabel, onSearch, screen, depth, actionSlot, locked, above, below, children }: {
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
  subtitle?: string | undefined;
  /** Makes the title a button (pin and title), e.g. to open the site list. */
  onTitle?: (() => void) | undefined;
  /** What the title opens is open: the button says so (aria-expanded). */
  titleOpen?: boolean | undefined;
  /** Instead of onTitle: wraps the title button (pin, title, chevron) in the page's own menu, e.g. a popover. */
  titleMenu?: ((button: { className: string; label: string; children: ReactNode }) => ReactNode) | undefined;
  /** A round ← before the title (wide: before `above`): one step back, wherever the panel is. */
  onBack?: (() => void) | undefined;
  /** What Back does, for screen readers (default "Back"). */
  backLabel?: string | undefined;
  /** Phones: a Search button on the bar (the page opens its search). At full screen it reads Map instead, and lowers the sheet. */
  onSearch?: (() => void) | undefined;
  /** Which screen the panel shows, and how deep it is: a new screen slides in from the right going deeper, from the left coming back. */
  screen?: string | undefined;
  depth?: number | undefined;
  /** A place beside the title for the page's own button (e.g. Edit), filled through a portal. Phones: it takes Search's place. */
  actionSlot?: ((el: HTMLElement | null) => void) | undefined;
  /** Without onTitle: the pin beside the title anyway, as a plain header (no chevron, not a button). */
  titleIcon?: boolean | undefined;
  /** Wide: the title is read out but not shown, e.g. when a breadcrumb above already says it. */
  titleHidden?: boolean | undefined;
  /** Phones: the sheet can't move just now (e.g. while drawing on the map): its bar shows no button, and drags are ignored. */
  locked?: boolean | undefined;
  /** Wide only: above the title (e.g. a breadcrumb) and under it (e.g. what's on the map), outside the form's scroll. */
  above?: ReactNode | undefined;
  below?: ReactNode | undefined;
  children: ReactNode;
}) {
  const title_ = wide && titleHidden ? <h2 className="sr-only">{title}</h2> : <Heading title={title} subtitle={subtitle} onTitle={onTitle} open={titleOpen} menu={titleMenu} icon={titleIcon} />;
  const back = onBack && (
    <button type="button" className={s.back} data-bar-action="" onClick={onBack} aria-label={backLabel ?? "Back"}>
      <ArrowLeft size={20} strokeWidth={2.4} aria-hidden="true" />
    </button>
  );
  const row = actionSlot ? <div className={s.headRow}>{title_}<div ref={actionSlot} /></div> : title_;
  const heading = wide
    ? <>{(back || above) && <div className={s.backRow}>{back}{above}</div>}{row}{below}</>
    : back ? <div className={s.backRow}>{back}{row}</div> : row;
  return <Sheet wide={wide} open={open} container={container} snap={snap} onSnap={onSnap} label={label} title={title} heading={heading} locked={locked} onSearch={actionSlot ? undefined : onSearch} screen={screen} depth={depth}>{children}</Sheet>;
}

function Sheet({ wide, open, container, snap, onSnap, label, title, heading, locked, onSearch, screen, depth = 0, children }: {
  wide: boolean; open: boolean; container: HTMLElement | null; snap: Snap; onSnap: (snap: Snap) => void;
  label: string; title: string; heading: ReactNode; locked?: boolean | undefined; onSearch?: (() => void) | undefined; screen?: string | undefined; depth?: number | undefined; children: ReactNode;
}) {
  const sheet = useRef<HTMLElement>(null);
  const visible = useRef<HTMLDivElement>(null);
  const spring = useRef<Spring | null>(null);
  const fling = useRef(0);
  const safeTop = useRef<HTMLSpanElement>(null);
  // A new screen slides in: from the right going deeper, from the left coming back. Animated, not remounted,
  // so nothing in the screens (a form's entries) is lost; not at all with reduced motion.
  const content = useRef<HTMLDivElement>(null);
  const shown = useRef({ screen, depth });
  useLayoutEffect(() => {
    const was = shown.current;
    shown.current = { screen, depth };
    const dir = Math.sign(depth - was.depth);
    if (screen === was.screen || !dir || !content.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    content.current.animate(
      [{ transform: `translateX(${dir * 32}px)`, opacity: 0 }, { transform: "none", opacity: 1 }],
      { duration: 260, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
  }, [screen, depth]);
  const [height, setHeight] = useState(0);
  const [fullY, setFullY] = useState(FULL_GAP);

  // The container's height decides where each snap sits; the status bar's, where full stops.
  useEffect(() => {
    if (!container) return;
    const measure = () => {
      setHeight(container.clientHeight);
      setFullY((safeTop.current?.offsetHeight ?? 0) + FULL_GAP);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [container]);

  const yFor = (at: Snap) => (at === "full" ? fullY : Math.max(0, height - sheetHeight(at, height)));
  // Drags and the spring read these, so they never see an old snap or height.
  const now = useRef({ height, snap, onSnap, wide, fullY, locked });
  useEffect(() => { now.current = { height, snap, onSnap, wide, fullY, locked }; });

  // One spring moves the sheet. Only the part on screen is laid out, and it follows the sheet
  // as it moves, so the list fills in while dragging and the form's own buttons stay on screen.
  const paint = useRef((y: number) => {
    if (now.current.wide) return; // the side panel doesn't move
    sheet.current!.style.transform = `translate3d(0, ${y}px, 0)`;
    const h = now.current.height;
    if (visible.current && h) visible.current.style.height = `${Math.min(h, Math.max(0, h - y))}px`;
  });
  useEffect(() => {
    const sp = new Spring(window.innerHeight, (y) => paint.current(y));
    spring.current = sp;
    return () => sp.stop();
  }, []);

  // The first placement is instant (no opening animation); every move after that springs.
  const placed = useRef(false);
  useEffect(() => {
    const sp = spring.current;
    // Wide: the side panel, where CSS places it. Coming back to a phone width, the sheet is placed at once.
    if (wide) {
      sheet.current!.style.transform = "";
      if (visible.current) visible.current.style.height = "";
      placed.current = false;
      return;
    }
    if (!height || !sp) return;
    const target = open ? (snap === "full" ? fullY : Math.max(0, height - sheetHeight(snap, height))) : height;
    if (placed.current) sp.to(target, fling.current);
    else sp.set(target);
    paint.current(sp.value); // the height may have changed with the sheet standing still
    placed.current = true;
    fling.current = 0;
  }, [open, snap, height, wide, fullY]);

  // A drag: the sheet follows the finger, rubber-bands past its ends, and on release goes where
  // the flick would carry it.
  function follow(start: number, dy: number) {
    const { height: h, fullY: top } = now.current;
    const bottom = Math.max(0, h - sheetHeight("peek", h));
    let y = start + dy;
    if (y < top) y = top + rubberBand(y - top, h);
    if (y > bottom) y = bottom + rubberBand(y - bottom, h);
    spring.current?.set(y);
  }
  function release(velocity: number) {
    const sp = spring.current;
    if (!sp) return;
    const { height: h, snap: at, onSnap: go, fullY: top } = now.current;
    const y = (to: Snap) => (to === "full" ? top : Math.max(0, h - sheetHeight(to, h)));
    const rest = sp.value + project(velocity);
    const next = (["full", "mid", "peek"] as const).reduce((best, to) => (Math.abs(y(to) - rest) < Math.abs(y(best) - rest) ? to : best));
    fling.current = velocity;
    sp.to(y(at), velocity); // back where it was, unless the page accepts the new snap
    if (next !== at) go(next);
  }
  const speed = (samples: { t: number; y: number }[], t: number, y: number) => {
    const first = samples[0];
    const dt = first ? (t - first.t) / 1000 : 0;
    return first && dt > 0 ? (y - first.y) / dt : 0;
  };

  // Fingers: drag from anywhere on the sheet. Below full screen every up-and-down drag moves
  // the sheet; at full screen the list scrolls, and pulling down from its top brings the sheet down.
  // Touch events, not pointer events: only they can stop the list scrolling once a drag is the sheet's.
  useEffect(() => {
    const el = sheet.current!;
    let drag: { x: number; y: number; start: number; mine: boolean | null; samples: { t: number; y: number }[]; list: HTMLElement | null } | null = null;
    const down = (e: TouchEvent) => {
      // A second finger ends the drag (the sheet goes to its nearest stop, not left where it was). Locked: no drags.
      if (e.touches.length !== 1 || !spring.current || now.current.wide || now.current.locked) {
        if (drag?.mine) release(0);
        drag = null;
        return;
      }
      const t = e.touches[0]!; // exactly one, just checked
      drag = { x: t.clientX, y: t.clientY, start: spring.current.value, mine: null, samples: [{ t: e.timeStamp, y: t.clientY }], list: scroller(e.target as HTMLElement, el) };
    };
    const move = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!drag || !t) return;
      const dx = t.clientX - drag.x, dy = t.clientY - drag.y;
      if (drag.mine === null) {
        if (Math.hypot(dx, dy) < 6) return;
        const vertical = Math.abs(dy) > Math.abs(dx);
        const atTop = !drag.list || drag.list.scrollTop <= 0;
        drag.mine = vertical && (now.current.snap !== "full" || (atTop && dy > 0));
        if (drag.mine) { drag.y = t.clientY; drag.samples = [{ t: e.timeStamp, y: t.clientY }]; }
      }
      if (!drag.mine) return;
      e.preventDefault();
      drag.samples.push({ t: e.timeStamp, y: t.clientY });
      while (drag.samples.length > 2 && e.timeStamp - drag.samples[0]!.t > 90) drag.samples.shift();
      follow(drag.start, t.clientY - drag.y);
    };
    const up = (e: TouchEvent) => {
      const d = drag;
      drag = null;
      if (!d?.mine) return;
      const t = e.changedTouches[0];
      release(t ? speed(d.samples, e.timeStamp, t.clientY) : 0);
    };
    el.addEventListener("touchstart", down, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", up);
    el.addEventListener("touchcancel", up);
    return () => {
      el.removeEventListener("touchstart", down);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", up);
      el.removeEventListener("touchcancel", up);
    };
  }, []);

  // The mouse (and a pen): drag the bar. A click without a drag opens it from peek (see openFromBar).
  const dragged = useRef(false);
  // A mouse press on the handle: dragged, it moves the sheet; clicked, the handle's button (Show the map) has it.
  const onHandle = useRef(false);
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragged.current = false;
    onHandle.current = !!(e.target as HTMLElement).closest("[data-handle]");
    if (wide || locked || e.pointerType === "touch" || (snap !== "peek" && (e.target as HTMLElement).closest("button:not([data-handle])")) || (e.target as HTMLElement).closest("[data-bar-action]") || !spring.current) return;
    const bar = e.currentTarget;
    const startY = e.clientY;
    const start = spring.current.value;
    const samples = [{ t: e.timeStamp, y: e.clientY }];
    let dragging = false;
    bar.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      if (!dragging && Math.abs(ev.clientY - startY) < 4) return;
      dragging = true;
      dragged.current = true;
      samples.push({ t: ev.timeStamp, y: ev.clientY });
      while (samples.length > 2 && ev.timeStamp - samples[0]!.t > 90) samples.shift();
      follow(start, ev.clientY - startY);
    };
    const up = (ev: PointerEvent) => {
      bar.removeEventListener("pointermove", move);
      bar.removeEventListener("pointerup", up);
      bar.removeEventListener("pointercancel", up);
      if (dragging) release(speed(samples, ev.timeStamp, ev.clientY));
    };
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", up);
    bar.addEventListener("pointercancel", up);
  }

  // At peek a tap anywhere on the bar, its title too, opens it half way; once open, the title changes
  // the site. Caught before the title's own click. A drag that ends on the bar isn't a tap: a touch drag
  // cancels the click, a mouse one is marked. Search does its own thing on the first tap (it raises the sheet itself).
  const opensFromBar = !wide && !locked && snap === "peek";
  // From half way or full screen, the handle is a button down to the map, so there's always a way back to it
  // without knowing to drag. Not at peek (the bar opens it) or while the sheet is locked.
  const showMap = !wide && !locked && snap !== "peek";
  function openFromBar(e: React.MouseEvent<HTMLDivElement>) {
    // Pulled up, a mouse click on the handle lands on the bar (the press was captured for a drag): Show the map.
    if (!opensFromBar && showMap && onHandle.current && !dragged.current && !(e.target as HTMLElement).closest("[data-handle]")) return onSnap("peek");
    if (!opensFromBar || (e.target as HTMLElement).closest("[data-bar-action]")) return;
    e.stopPropagation();
    e.preventDefault();
    if (!dragged.current) onSnap("mid");
  }

  return (
    <section
      ref={sheet} className={wide ? s.side : s.sheet} data-snap={wide ? undefined : snap} aria-label={`${label}: ${title}`}
      hidden={wide ? !open : !container}
    >
      {/* Measures the status bar's height, where the full sheet stops. */}
      <span ref={safeTop} className={s.safeTop} aria-hidden="true" />
      {/* Phones: its height follows the sheet (set as it moves), starting at this snap's. */}
      <div ref={visible} className={s.visible} style={wide ? undefined : { height: Math.max(0, height - yFor(snap)) }}>
      <div className={wide ? s.sideHeading : s.bar} data-opens={opensFromBar || undefined} onPointerDown={onPointerDown} onClickCapture={openFromBar}>
        {!wide && (opensFromBar
          // The handle is the bar's control for a keyboard or screen reader; a tap anywhere on the bar does the same.
          ? <button type="button" data-handle className={s.handle} aria-label={`Open ${label.toLowerCase()}`} aria-expanded={false} />
          : showMap ? <button type="button" data-handle className={s.handle} aria-label="Show the map" onClick={() => onSnap("peek")} />
          : <span className={s.handle} aria-hidden="true" />)}
        <div className={s.barText}>
          {heading}
        </div>
        {!wide && !locked && onSearch && (
          // Full screen covers the map: the button takes you back to it, its chevron pointing the way the sheet goes.
          <button type="button" className={s.barButton} data-bar-action="" onClick={snap === "full" ? () => onSnap("peek") : onSearch} aria-label={snap === "full" ? "Show the map" : "Search sites"}>
            {snap === "full" ? <><MapIcon size={16} strokeWidth={2.4} aria-hidden="true" />Map<ChevronDown size={16} strokeWidth={2.4} aria-hidden="true" /></> : <><Search size={16} strokeWidth={2.4} aria-hidden="true" />Search</>}
          </button>
        )}
      </div>
      {/* A field focused in the preview takes the sheet full screen, above the keyboard. */}
      <div
        ref={content} className={s.scroll}
        onFocusCapture={(e) => { if (!wide && snap === "mid" && (e.target as HTMLElement).matches("input, textarea")) onSnap("full"); }}
      >
        {/* Mounted once open, like the side panel, so the form starts after whatever opens it. */}
        {open && children}
      </div>
      </div>
    </section>
  );
}

/** The nearest list that scrolls, from `el` up to the sheet. */
function scroller(el: HTMLElement | null, sheet: HTMLElement): HTMLElement | null {
  for (; el && el !== sheet; el = el.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight) return el;
  }
  return null;
}

/** The title, as a button when `onTitle` is given (a pin, the title and its line), or a menu with a chevron. */
function Heading({ title, subtitle, onTitle, open, menu, icon }: {
  title: string; subtitle?: string | undefined; onTitle?: (() => void) | undefined; open?: boolean | undefined;
  menu?: ((button: { className: string; label: string; children: ReactNode }) => ReactNode) | undefined; icon?: boolean | undefined;
}) {
  const text = (
    <span className={s.titleText}>
      <b>{title}</b>
      {subtitle && <span>{subtitle}</span>}
    </span>
  );
  const pin = (
    <span className={s.titleIcon} aria-hidden="true">
      <MapPin size={22} strokeWidth={2.2} />
    </span>
  );
  // Only a real menu has the chevron: a title that opens the site list doesn't need one (the bar's Map and Back close it).
  if (menu) return menu({ className: s.titleButton!, label: `${title}${subtitle ? `, ${subtitle}` : ""}: change`, children: <>{pin}{text}<ChevronDown size={22} strokeWidth={2.4} /></> });
  if (!onTitle) return icon ? <div className={s.titlePlain}>{pin}{text}</div> : text;
  return (
    <button type="button" className={s.titleButton} onClick={onTitle} aria-expanded={open} aria-label={`${title}${subtitle ? `, ${subtitle}` : ""}: change`}>
      {pin}
      {text}
    </button>
  );
}
