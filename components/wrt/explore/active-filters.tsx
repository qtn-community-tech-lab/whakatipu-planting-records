import type { Lookups } from "@/lib/wrt/queries";
import { REVIEW_THEMES } from "@/lib/wrt/review-themes";
import Link from "next/link";
import { type ParamKey, type RecordsView, recordsHref } from "./filters";
import "./explore.css";

/** Each active filter as a soft chip that is a link removing just that filter. */
export function ActiveFilters({ view, lookups }: { view: RecordsView; lookups: Lookups }) {
  const f = view.filter;
  const chips: { key: ParamKey; kind: string; label: string }[] = [];
  const place = f.place ? lookups.places.find((p) => p.slug === f.place) : undefined;
  const parcel = place?.parcels.find((p) => p.id === f.parcel);
  const species = f.species ? lookups.species.find((s) => s.slug === f.species) : undefined;
  if (place) chips.push({ key: "place", kind: "site", label: place.name });
  if (parcel) chips.push({ key: "parcel", kind: "part of site", label: parcel.name });
  if (species) chips.push({ key: "species", kind: "species", label: species.displayName });
  if (f.year) chips.push({ key: "year", kind: "year", label: String(f.year) });
  if (f.season) chips.push({ key: "season", kind: "season", label: f.season });
  if (f.review) chips.push({ key: "review", kind: "review status", label: f.review === "needs-review" ? "Needs review" : "Resolved" });
  if (f.theme) chips.push({ key: "theme", kind: "review question", label: REVIEW_THEMES[f.theme].label });
  if (f.q) chips.push({ key: "q", kind: "search", label: `“${f.q}”` });
  if (!chips.length) return null;
  return (
    <div className="exp-chips" aria-label="Active filters">
      <span className="wrt-muted">Filtered by</span>
      {chips.map((c) => (
        <Link key={c.key} href={recordsHref(view, { [c.key]: undefined })} className="exp-chip" aria-label={`Remove ${c.kind} filter: ${c.label}`}>
          {c.label} <span aria-hidden>×</span>
        </Link>
      ))}
    </div>
  );
}
