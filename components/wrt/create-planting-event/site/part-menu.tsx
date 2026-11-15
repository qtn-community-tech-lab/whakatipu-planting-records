"use client";
import { ArrowLeftRight, Check, List, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import s from "./part-menu.module.css";

/**
 * The site's parts in a dark menu, "Whole site" first, the chosen one ticked; then, when given,
 * "New sublocation", "Another site" and "All sites". Opened by the button it wraps (`children`, styled by `className`):
 * the map's dock on phones (opens upwards), the panel's breadcrumb and title, and the form's place tile.
 */
export function PartMenu({ siteName, parts, part, onChoosePart, onAddPart, onOtherSite, onAllSites, side, className, label, children }: {
  siteName: string;
  /** `unsaved`: added on the map this visit, tagged "Not saved yet". */
  parts: { id: string; name: string; unsaved?: boolean | undefined }[];
  /** The chosen part's id, or null: the site as a whole. */
  part: string | null;
  onChoosePart: (id: string | null) => void;
  onAddPart?: (() => void) | undefined;
  onOtherSite?: (() => void) | undefined;
  onAllSites?: (() => void) | undefined;
  side: "top" | "bottom";
  className?: string | undefined;
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pick = (fn: () => void) => () => { setOpen(false); fn(); };
  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger className={className} aria-label={label}>{children}</PopoverTrigger>
      <PopoverContent side={side} align="start" sideOffset={10} collisionPadding={12} className={s.menu}>
        <p>{siteName}</p>
        {[{ id: null as string | null, name: "Whole site" }, ...parts].map((p) => (
          <button key={p.id ?? ""} type="button" aria-current={p.id === part ? "true" : undefined} onClick={pick(() => onChoosePart(p.id))}>
            <span>{p.id === part && <Check size={16} strokeWidth={2.6} aria-hidden="true" />}</span>
            {p.name}{"unsaved" in p && p.unsaved && <small> · Not saved yet</small>}
          </button>
        ))}
        {onAddPart && (
          <button type="button" className={s.other} onClick={pick(onAddPart)}>
            <span><Plus size={16} strokeWidth={2.4} aria-hidden="true" /></span>
            New sublocation of {siteName}
          </button>
        )}
        {onOtherSite && (
          <button type="button" className={s.other} onClick={pick(onOtherSite)}>
            <span><ArrowLeftRight size={16} strokeWidth={2.2} aria-hidden="true" /></span>
            Another site
          </button>
        )}
        {onAllSites && (
          <button type="button" className={s.other} onClick={pick(onAllSites)}>
            <span><List size={16} strokeWidth={2.2} aria-hidden="true" /></span>
            All sites
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
