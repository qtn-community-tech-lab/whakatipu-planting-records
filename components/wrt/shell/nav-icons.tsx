import type { ReactNode } from "react";
import type { NavIcon } from "./nav";

/**
 * Hand-drawn nav glyphs (24px grid, 1.75 stroke, round caps) so the sidebar
 * needs no icon dependency. Decorative only: the label carries the meaning.
 */
const PATHS: Record<NavIcon, ReactNode> = {
  // Whakatipu skyline with a low sun
  overview: (
    <>
      <path d="M2.5 19.5 8.5 10l3.6 5 2.6-3.4 6.8 7.9Z" />
      <circle cx="17" cy="6" r="2.2" />
    </>
  ),
  sites: (
    <>
      <path d="M12 21s-6.5-5.7-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 15.3 12 21 12 21Z" />
      <circle cx="12" cy="9.8" r="2.3" />
    </>
  ),
  species: (
    <>
      <path d="M12 21v-8.5" />
      <path d="M12 13.2C12 9 9.2 6.6 4.8 6.6c0 4.2 2.8 6.6 7.2 6.6Z" />
      <path d="M12 11c0-3.8 2.6-6.1 6.9-6.1 0 3.8-2.6 6.1-6.9 6.1Z" />
    </>
  ),
  // Half-and-half disc: autumn and spring
  seasons: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 0 0 17Z" fill="currentColor" stroke="none" />
    </>
  ),
  records: (
    <>
      <path d="M9 6.5h11M9 12h11M9 17.5h11" />
      <circle cx="4.6" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.6" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.6" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  // A drawn area (polygon with corner dots) and a plus: record a new planting
  events: (
    <>
      <path d="M4 15.5 7 5l8.5 2.5L13 17Z" />
      <circle cx="4" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="7" cy="5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
      <path d="M18.5 14v6M15.5 17h6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M21 20v-2a6 6 0 0 0-4-5.7" />
    </>
  ),
  // Speech bubble with a leaf inside
  ask: (
    <>
      <path d="M4 5.5h16v10H10l-4.5 3.5v-3.5H4Z" />
      <path d="M12 13c0-2.6 1.6-4.2 4.2-4.2 0 2.6-1.6 4.2-4.2 4.2Z" />
    </>
  ),
  about: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.2" />
      <circle cx="12" cy="7.8" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
};

export function NavGlyph({ name }: { name: NavIcon }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

/** Tree-ring mark: the trust's history read like a cross-section. */
export function BrandMark({ size = 38 }: { size?: number }) {
  return (
    <svg className="wrt-mark" viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" focusable="false">
      <circle className="wrt-mark__disc" cx="20" cy="20" r="19" />
      <circle className="wrt-mark__ring wrt-mark__ring--3" cx="20" cy="20" r="14.5" />
      <circle className="wrt-mark__ring wrt-mark__ring--2" cx="20" cy="20" r="10" />
      <circle className="wrt-mark__ring wrt-mark__ring--1" cx="20" cy="20" r="5.6" />
      <circle className="wrt-mark__pith" cx="20" cy="20" r="2.2" />
    </svg>
  );
}
