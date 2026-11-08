"use client";
/**
 * Choose where: a search, then every site as an accordion (Radix, one open at a
 * time, animated) that opens to "The site as a whole" and its parts. A site with
 * no parts is a single row. A native <dialog>, so focus, Escape and the backdrop
 * come with it.
 */
import { ChevronDown } from "lucide-react";
import { Accordion } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import type { SiteOption } from "@/lib/wrt/events/form-options";
import { formatNumber, rankMatches } from "@/lib/wrt/text";
import s from "./record-sheet.module.css";

export function SiteChooser({ open, sites, totals, value, onChoose, onClose }: {
  open: boolean;
  sites: readonly SiteOption[];
  /** Plants and species recorded at each site ("slug") and part ("slug/part id"). */
  totals: Record<string, { plants: number; species: number }>;
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

  // "1,280 plants · 30 species", or "No plants recorded yet".
  const amount = (key: string) => {
    const x = totals[key];
    return x?.plants ? `${formatNumber(x.plants)} plants · ${x.species} species` : "No plants recorded yet";
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
    >
      <header className={s.chooserHead}>
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
