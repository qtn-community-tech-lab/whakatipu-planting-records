"use client";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PartMenu } from "../part-menu";
import s from "./navigator.module.css";

/**
 * Where you are, at the top of the wide panel: All sites › the site › its part.
 * All sites leaves the site, the site opens the site chooser, the part opens a menu of the site's parts.
 */
export function Crumbs({ siteName, parts, part, partName, choosing, onAllSites, onChooseSite, onChoosePart }: {
  /** None yet: "Choose a site". */
  siteName?: string | undefined;
  parts: { id: string; name: string }[];
  part: string | null;
  partName?: string | undefined;
  /** The site chooser is open: the site crumb says so, and a click closes it. */
  choosing: boolean;
  onAllSites: () => void;
  onChooseSite: () => void;
  onChoosePart: (id: string | null) => void;
}) {
  const sep = <ChevronRight size={14} strokeWidth={2.4} aria-hidden="true" />;
  return (
    <nav className={s.crumbs} aria-label="Where you are">
      {siteName ? <button type="button" onClick={onAllSites}>All sites</button> : <span>All sites</span>}
      {sep}
      <button type="button" onClick={onChooseSite} aria-expanded={choosing} aria-label={siteName ? `${siteName}: change site` : "Choose a site"}>
        <span>{siteName ?? "Choose a site"}</span>
      </button>
      {/* A site with no parts is only ever the site as a whole: nothing to choose. */}
      {siteName && parts.length > 0 && (
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
