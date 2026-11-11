"use client";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PartMenu } from "../part-menu";
import s from "./navigator.module.css";

/**
 * Where you are, at the top of the wide panel once a site is chosen: All sites › the site › its part.
 * All sites leaves the site for the site chooser. The site goes up to the site as a whole and takes the
 * map to its pin; the part opens a menu of the site's parts, and choosing one takes the map there.
 */
export function Crumbs({ siteName, parts, part, partName, onAllSites, onSite, onChoosePart }: {
  /** None yet: no trail (the panel is All sites, and its heading says so). */
  siteName?: string | undefined;
  parts: { id: string; name: string }[];
  part: string | null;
  partName?: string | undefined;
  onAllSites: () => void;
  /** The site as a whole, on the map. */
  onSite: () => void;
  onChoosePart: (id: string | null) => void;
}) {
  if (!siteName) return null;
  const sep = <ChevronRight size={14} strokeWidth={2.4} aria-hidden="true" />;
  return (
    <nav className={s.crumbs} aria-label="Where you are">
      <button type="button" onClick={onAllSites}>All sites</button>
      {sep}
      <button type="button" onClick={onSite} aria-label={`${siteName}: the site as a whole, on the map`}>
        <span>{siteName}</span>
      </button>
      {/* A site with no parts is only ever the site as a whole: nothing to choose. */}
      {parts.length > 0 && (
        <>
          {sep}
          <PartMenu siteName={siteName} parts={parts} part={part} onChoosePart={onChoosePart} side="bottom" className={s.partCrumb} label={`${partName ?? "The site as a whole"}: change the part`}>
            <span>{partName ?? "The site as a whole"}</span>
            <ChevronDown size={14} strokeWidth={2.4} aria-hidden="true" />
          </PartMenu>
        </>
      )}
    </nav>
  );
}
