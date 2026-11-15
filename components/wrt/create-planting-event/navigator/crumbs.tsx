"use client";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PartMenu } from "../site/part-menu";
import s from "./navigator.module.css";

/** Where you are, at the top of the wide panel once a site is chosen: All sites › the site › its part (a menu). */
export function Crumbs({ siteName, parts, part, partName, onAllSites, onSite, onChoosePart, onOtherSite }: {
  /** None yet: no trail (the panel is All sites, and its heading says so). */
  siteName?: string | undefined;
  parts: { id: string; name: string }[];
  part: string | null;
  partName?: string | undefined;
  onAllSites: () => void;
  onSite: () => void;
  onChoosePart: (id: string | null) => void;
  /** The part menu's Another site (the site list). */
  onOtherSite: () => void;
}) {
  if (!siteName) return null;
  const sep = <ChevronRight size={14} strokeWidth={2.4} aria-hidden="true" />;
  return (
    <nav className={s.crumbs} aria-label="Where you are">
      <button type="button" onClick={onAllSites}>All sites</button>
      {sep}
      <button type="button" onClick={onSite} aria-label={`${siteName}: whole site, on the map`}>
        <span>{siteName}</span>
      </button>
      {/* Every site has the menu: its parts (a site with none is only ever the whole site) and Another site. */}
      {sep}
      <PartMenu
        siteName={siteName} parts={parts} part={part} onChoosePart={onChoosePart} onOtherSite={onOtherSite}
        side="bottom" className={s.partCrumb} label={`${partName ?? "Whole site"}: change the part`}
      >
        <span>{partName ?? "Whole site"}</span>
        <ChevronDown size={14} strokeWidth={2.4} aria-hidden="true" />
      </PartMenu>
    </nav>
  );
}
