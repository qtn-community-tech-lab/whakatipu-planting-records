"use client";
import { ArrowLeft, ChevronDown, LocateFixed, MapPin, Pencil, Plus, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import s from "./create-planting-event.module.css";

/**
 * The session header over the map: a back button, the site in the middle (tap it to change the
 * site, like the form's title; a line under it says where you are in the form, and × leaves the
 * site for every site), and a + menu for adding to the map: a new location, or a drawn area.
 * It's the only way to add to the map from the header. Wide screens show only the back button: the panel's
 * breadcrumb and the map's toolbar do the rest (create-planting-event.module.css). The +, title and part menus
 * are modal, so the tap that closes one doesn't also land on the map (which would leave the site).
 */
export function TopBar({ siteName, hint, exitHref, onExit, choosing, onChooseSite, onLeaveSite, onAddLocation, onDrawArea, onFindMe }: {
  siteName?: string | undefined;
  /** Under the site: the part, or "New planting event" once one is started. */
  hint?: string | undefined;
  exitHref: Route;
  /** The back button: the host asks first if there's unsaved work, then goes to `exitHref`. */
  onExit: () => void;
  /** The site chooser is open: the site's chevron points up, and a tap closes it. */
  choosing: boolean; onChooseSite: () => void;
  /** Back to every site (the host asks first with unsaved work). Only with a site. */
  onLeaveSite?: (() => void) | undefined;
  /** Left out once an area is drawn: a pin as well would only confuse where it was planted. */
  onAddLocation?: (() => void) | undefined; onDrawArea: () => void;
  /** The map to where you are (as the wide toolbar's Find me). */
  onFindMe: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const pick = (fn: () => void) => () => { setMenu(false); fn(); };
  return (
    <div className={s.top}>
      <Link href={exitHref} className={s.exit} aria-label="Leave the map" onClick={(e) => { e.preventDefault(); onExit(); }}>
        <ArrowLeft size={20} strokeWidth={2.4} />
      </Link>
      <div className={s.session}>
        <button type="button" className={s.sessionMain} onClick={onChooseSite} aria-expanded={choosing} aria-label={siteName ? `${siteName}${hint ? `, ${hint}` : ""}: change site` : "Choose a site"}>
          <MapPin size={16} strokeWidth={2.2} />
          <span className={s.sessionText}>
            <b>{siteName ?? "Choose a site"}</b>
            {hint && <small>{hint}</small>}
          </span>
          <ChevronDown size={16} strokeWidth={2.4} />
        </button>
        {siteName && onLeaveSite && (
          <button type="button" className={s.sessionLeave} onClick={onLeaveSite} aria-label="Leave this site: back to every site">
            <X size={16} strokeWidth={2.6} />
          </button>
        )}
      </div>
      <Popover open={menu} onOpenChange={setMenu} modal>
        <PopoverTrigger className={s.add} aria-label="Add to the map" data-draws="">
          <Plus size={20} strokeWidth={2.6} />
        </PopoverTrigger>
        {/* Opens rightwards, into the map, so on desktop it never covers the form; on phones it shifts back on screen. */}
        <PopoverContent align="start" sideOffset={8} collisionPadding={12} className={s.addMenu}>
          {onAddLocation && (
            <button type="button" onClick={pick(onAddLocation)}>
              <MapPin size={18} strokeWidth={2.2} />
              New location
            </button>
          )}
          <button type="button" onClick={pick(onDrawArea)}>
            <Pencil size={18} strokeWidth={2.4} />
            Draw area
          </button>
          <button type="button" onClick={pick(onFindMe)}>
            <LocateFixed size={18} strokeWidth={2.2} />
            Find me
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
