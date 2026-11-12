"use client";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PartMenu } from "../part-menu";
import s from "./navigator.module.css";

/**
 * Where you are, at the top of the wide panel once a site is chosen: All sites › the site › its part.
 * All sites leaves the site for every site. The site goes up to the site as a whole and takes the
 * map to its pin; the part opens a menu of the site's parts (choosing one takes the map there), New sublocation and Another site.
 */
export function Crumbs({ siteName, parts, part, partName, onAllSites, onSite, onChoosePart, onOtherSite, onAddPart, partsLocked, locked, bare }: {
  /** None yet: no trail (the panel is All sites, and its heading says so). */
  siteName?: string | undefined;
  parts: { id: string; name: string }[];
  part: string | null;
  partName?: string | undefined;
  onAllSites: () => void;
  /** The site as a whole, on the map. */
  onSite: () => void;
  onChoosePart: (id: string | null) => void;
  /** The part menu's Another site (the site list) and New sublocation. */
  onOtherSite?: (() => void) | undefined;
  onAddPart?: (() => void) | undefined;
  /** No part menu: a new location is being added, its cross is up, or the place can't change now. */
  partsLocked?: boolean | undefined;
  /** Drawing or placing: the trail is there, but nothing in it goes anywhere until that's done. */
  locked?: boolean | undefined;
  /** No site, and not at All sites (an area far from every site, a new site): only the way back to All sites. */
  bare?: boolean | undefined;
}) {
  if (!siteName) return bare ? <nav className={s.crumbs} aria-label="Where you are"><button type="button" onClick={onAllSites} disabled={locked}>All sites</button></nav> : null;
  const sep = <ChevronRight size={14} strokeWidth={2.4} aria-hidden="true" />;
  return (
    <nav className={s.crumbs} aria-label="Where you are">
      <button type="button" onClick={onAllSites} disabled={locked}>All sites</button>
      {sep}
      <button type="button" onClick={onSite} disabled={locked} aria-label={`${siteName}: whole site, on the map`}>
        <span>{siteName}</span>
      </button>
      {/* Every site has the menu: its parts (a site with none is only ever the whole site), New sublocation and Another site. */}
      {!partsLocked && sep}
      {!partsLocked && <PartMenu
        siteName={siteName} parts={parts} part={part} onChoosePart={onChoosePart} onAddPart={onAddPart} onOtherSite={onOtherSite}
        side="bottom" className={s.partCrumb} label={`${partName ?? "Whole site"}: change the part`}
      >
        <span>{partName ?? "Whole site"}</span>
        <ChevronDown size={14} strokeWidth={2.4} aria-hidden="true" />
      </PartMenu>}
    </nav>
  );
}
