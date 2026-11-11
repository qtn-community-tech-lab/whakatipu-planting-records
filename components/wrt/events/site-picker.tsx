"use client";
/**
 * Site and Part of site choosers for the planting-event form: the shared
 * ComboboxInput, searched like species (rankMatches: ignores macrons,
 * tolerates typos).
 *
 * Part of site is optional: left empty, the planting is for the site as a
 * whole, and × clears back to that. It is greyed out until a site with more
 * than one part is chosen.
 */
import { ComboboxInput, type FieldProps } from "@/components/ui/inputs";
import type { SiteOption, SitePartOption } from "@/lib/wrt/events/form-options";
import { rankMatches } from "@/lib/wrt/text";

const siteValue = (s: SiteOption) => s.slug;
const partValue = (p: SitePartOption) => p.id;
const getLabel = (item: { name: string }) => item.name;
const noSite = (q: string) => `No site matches “${q}”.`;
const noPart = (q: string) => `No part of this site matches “${q}”.`;

export function SitePicker({
  sites, value, onChange, ...field
}: FieldProps & {
  sites: SiteOption[];
  /** Selected site slug, or "" for none yet. */
  value: string;
  onChange: (slug: string) => void;
}) {
  return (
    <ComboboxInput
      {...field}
      items={sites}
      value={value}
      onChange={onChange}
      getValue={siteValue}
      getLabel={getLabel}
      rank={rankMatches}
      placeholder="Search sites"
      clearLabel="Clear site"
      empty={noSite}
    />
  );
}

export function SitePartPicker({
  site, value, onChange, ...field
}: FieldProps & {
  /** The chosen site, or undefined before one is chosen. */
  site: SiteOption | undefined;
  /** Selected part id, or null for the site as a whole. */
  value: string | null;
  onChange: (partId: string | null) => void;
}) {
  // A site with a single part has nothing to choose between.
  const parts = site && site.parts.length > 1 ? site.parts : [];
  const placeholder = !site ? "Choose a site first" : parts.length === 0 ? "This site has one part" : "Whole site";

  return (
    <ComboboxInput
      {...field}
      items={parts}
      value={value ?? ""}
      onChange={(id) => onChange(id || null)}
      getValue={partValue}
      getLabel={getLabel}
      rank={rankMatches}
      placeholder={placeholder}
      clearLabel="Clear part of site"
      empty={noPart}
      disabled={parts.length === 0}
    />
  );
}
