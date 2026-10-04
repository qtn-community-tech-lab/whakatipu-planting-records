"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { NAV_FOOT, NAV_MAIN, isActive, type NavCounts, type NavItem } from "./nav";
import { NavGlyph } from "./nav-icons";

/**
 * One nav list with a pill that slides to the active item. The pill is a
 * separate element so it can glide between links instead of blinking.
 */
function NavGroup({
  items, label, counts, onNavigate, foot,
}: {
  items: readonly NavItem[];
  label: string;
  counts?: NavCounts;
  onNavigate?: () => void;
  foot?: boolean;
}) {
  const pathname = usePathname();
  const listRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ top: number; height: number } | null>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const place = () => {
      const active = list.querySelector<HTMLElement>('[aria-current="page"]');
      setPill(active ? { top: active.offsetTop, height: active.offsetHeight } : null);
    };
    place();
    // Let the first placement land without animating, then enable the glide.
    const id = requestAnimationFrame(() => setReady(true));
    const ro = new ResizeObserver(place);
    ro.observe(list);
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
    };
  }, [pathname]);

  return (
    <nav className={foot ? "wrt-snav wrt-snav--foot" : "wrt-snav"} aria-label={label}>
      <div ref={listRef} className="wrt-snav__list">
        <span
          className="wrt-snav__pill"
          data-ready={ready || undefined}
          aria-hidden="true"
          style={pill ? { transform: `translateY(${pill.top}px)`, height: pill.height, opacity: 1 } : { opacity: 0 }}
        />
        {items.map((n) => {
          const active = isActive(pathname, n.href);
          const count = n.count ? counts?.[n.count] : undefined;
          return (
            <Link
              key={n.href}
              href={n.href}
              className="wrt-snav__item"
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
            >
              <span className="wrt-snav__glyph">
                <NavGlyph name={n.icon} />
              </span>
              <span className="wrt-snav__label">{n.label}</span>
              {count && <span className="wrt-snav__count tabular-nums">{count}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SidebarNav({ onNavigate, counts }: { onNavigate?: () => void; counts?: NavCounts }) {
  return <NavGroup items={NAV_MAIN} label="Main" counts={counts} onNavigate={onNavigate} />;
}

export function SidebarFootNav({ onNavigate }: { onNavigate?: () => void }) {
  return <NavGroup items={NAV_FOOT} label="About" onNavigate={onNavigate} foot />;
}

export function Crumb() {
  const pathname = usePathname();
  const label = [...NAV_MAIN, ...NAV_FOOT].find((n) => n.href !== "/" && pathname.startsWith(n.href));
  if (pathname === "/") return <span className="wrt-topbar__crumb">Overview</span>;
  if (!label) return <span className="wrt-topbar__crumb" />;
  const deeper = pathname !== label.href;
  return (
    <span className="wrt-topbar__crumb">
      {deeper ? <Link href={label.href}>{label.label}</Link> : label.label}
    </span>
  );
}
