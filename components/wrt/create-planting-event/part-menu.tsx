"use client";
import { Check, MapPin } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import s from "./part-menu.module.css";

/**
 * The site's parts in a dark menu, "The site as a whole" first, the chosen one ticked; with
 * `onChangeSite`, "Another site" last. Opened by the button it wraps (`children`, styled by `className`):
 * the map's dock on phones (opens upwards), the panel's breadcrumb on wide screens (downwards).
 */
export function PartMenu({ siteName, parts, part, onChoosePart, onChangeSite, side, className, label, children }: {
  siteName: string;
  parts: { id: string; name: string }[];
  /** The chosen part's id, or null: the site as a whole. */
  part: string | null;
  onChoosePart: (id: string | null) => void;
  onChangeSite?: (() => void) | undefined;
  side: "top" | "bottom";
  className?: string | undefined;
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pick = (fn: () => void) => () => { setOpen(false); fn(); };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={className} aria-label={label}>{children}</PopoverTrigger>
      <PopoverContent side={side} align="start" sideOffset={10} collisionPadding={12} className={s.menu}>
        <p>{siteName}</p>
        {[{ id: null as string | null, name: "The site as a whole" }, ...parts].map((p) => (
          <button key={p.id ?? ""} type="button" aria-current={p.id === part ? "true" : undefined} onClick={pick(() => onChoosePart(p.id))}>
            <span>{p.id === part && <Check size={16} strokeWidth={2.6} aria-hidden="true" />}</span>
            {p.name}
          </button>
        ))}
        {onChangeSite && (
          <button type="button" className={s.other} onClick={pick(onChangeSite)}>
            <span><MapPin size={16} strokeWidth={2.2} aria-hidden="true" /></span>
            Another site
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
