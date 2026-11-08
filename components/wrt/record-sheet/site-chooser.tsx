"use client";
/**
 * Choose where: a search, then every site as an accordion (Radix, one open at a
 * time, animated) that opens to "The site as a whole" and its parts. A site with
 * no parts is a single row. A native <dialog>, so focus, Escape and the backdrop
 * come with it. On phones it's a bottom sheet with a handle: drag it (or the title) down to close,
 * or tap the map above it.
 */
import { ChevronDown } from "lucide-react";
import { Accordion } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { plantsLine, type PlantTotals } from "@/components/wrt/events/map-event-form";
import type { SiteOption } from "@/lib/wrt/events/form-options";
import { rankMatches } from "@/lib/wrt/text";
import s from "./site-chooser.module.css";

export function SiteChooser({ open, sites, totals, value, onChoose, onClose }: {
  open: boolean;
  sites: readonly SiteOption[];
  /** Plants and species recorded at each site ("slug") and part ("slug/part id"). */
  totals: PlantTotals;
  /** The current choice, marked in the list. */
  value: { slug: string; parcelId: string | null };
  onChoose: (slug: string, parcelId: string | null) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const q = query.trim();

  useEffect(() => {
    const d = dialog.current!;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // With a search: sites that match, or that have a part that matches (only those parts shown).
  const shown = sites.flatMap((site) => {
    const siteHit = !q || rankMatches([site], q).length > 0;
    const parts = q && !siteHit ? rankMatches(site.parts, q) : site.parts;
    return siteHit || parts.length ? [{ site, parts }] : [];
  });

  const amount = (key: string) => plantsLine(totals[key]);

  // Phones: drag the top of the sheet down to close it (past 90px), or let go to put it back.
  const drag = useRef<{ y: number; id: number } | null>(null);
  const [pull, setPull] = useState(0);
  const grab = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = { y: e.clientY, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (drag.current?.id === e.pointerId) setPull(Math.max(0, e.clientY - drag.current.y));
  };
  const drop = () => {
    if (!drag.current) return;
    drag.current = null;
    if (pull > 90) onClose();
    setPull(0);
  };

  const rows = () => shown.map(({ site, parts }) => {
    const chosenHere = value.slug === site.slug;
    if (site.parts.length === 0) {
      return <ul key={site.slug} className={s.chooserRow}>{option(site.name, site.slug, null, amount(site.slug))}</ul>;
    }
    const chosenPart = chosenHere ? site.parts.find((p) => p.id === value.parcelId)?.name ?? "The site as a whole" : null;
    return (
      <Accordion.Item key={site.slug} value={site.slug} className={s.chooserItem}>
        <Accordion.Header className={s.chooserHeader}>
          <Accordion.Trigger className={s.chooserTrigger}>
            <span className={s.chooserText}>
              <b>{site.name}</b>
              <span>{chosenPart ? `Chosen: ${chosenPart}` : `${amount(site.slug)} · ${site.parts.length} ${site.parts.length === 1 ? "part" : "parts"}`}</span>
            </span>
            <ChevronDown size={16} strokeWidth={2.4} />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className={s.chooserContent}>
          <ul>
            {(!q || rankMatches([site], q).length > 0) && option("The site as a whole", site.slug, null, amount(site.slug))}
            {parts.map((p) => option(p.name, site.slug, p.id, amount(`${site.slug}/${p.id}`)))}
          </ul>
        </Accordion.Content>
      </Accordion.Item>
    );
  });

  const option = (label: string, slug: string, parcelId: string | null, sub?: string) => {
    const on = value.slug === slug && value.parcelId === parcelId;
    return (
      <li key={parcelId ?? "whole"}>
        <button type="button" className={s.choice} aria-pressed={on} onClick={() => onChoose(slug, parcelId)}>
          <span className={s.chooserText}>
            <b>{label}</b>
            {sub && <span>{sub}</span>}
          </span>
          {on && <span className={s.choiceOn}>Chosen</span>}
        </button>
      </li>
    );
  };

  return (
    <dialog
      ref={dialog} className={s.chooser} aria-labelledby="site-chooser-title"
      onClose={onClose} onClick={(e) => { if (e.target === dialog.current) onClose(); }}
      style={pull ? { transform: `translateY(${pull}px)`, transition: "none" } : undefined}
    >
      <header className={s.chooserHead} onPointerDown={grab} onPointerMove={move} onPointerUp={drop} onPointerCancel={drop}>
        <span className={s.chooserHandle} aria-hidden="true" />
        <h2 id="site-chooser-title">Where was it planted?</h2>
        <button type="button" className={s.chooserClose} aria-label="Close" onClick={onClose}>×</button>
      </header>
      <label className={s.chooserSearch}>
        <span className="sr-only">Search sites and parts</span>
        <input type="search" value={query} placeholder="Search sites and parts" onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
      </label>
      <div className={s.chooserList}>
        {/* Browsing: one site open at a time. Searching: every match open, so its parts show. */}
        {q ? (
          <Accordion.Root key={`search-${q}`} type="multiple" defaultValue={shown.map((x) => x.site.slug)}>{rows()}</Accordion.Root>
        ) : (
          <Accordion.Root key="browse" type="single" collapsible defaultValue={value.slug}>{rows()}</Accordion.Root>
        )}
        {shown.length === 0 && <p className={s.chooserEmpty}>No site or part matches “{q}”.</p>}
      </div>
    </dialog>
  );
}
