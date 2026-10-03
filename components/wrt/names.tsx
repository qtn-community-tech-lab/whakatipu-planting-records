/**
 * Names and labels. IDs are never rendered: users see names.
 */
import Link from "next/link";
import type { Confidence, Place, Precision, SiteClass, Species } from "@/lib/wrt/types";
import { CONFIDENCE_LABELS, PRECISION_LABELS, SITE_CLASS_LABELS } from "@/lib/wrt/review-themes";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const hrefs = {
  place: (slug: string) => `/sites/${slug}`,
  species: (slug: string) => `/species/${slug}`,
  season: (slug: string) => `/seasons/${slug}`,
  records: (params: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") sp.set(k, String(v));
    const s = sp.toString();
    return s ? `/records?${s}` : "/records";
  },
};

/** Canopy SpeciesName: common (or Māori) name first, botanical name in italics beneath. */
export function SpeciesName({ species, link = false, size = "md" }: { species: Species; link?: boolean; size?: "md" | "lg" }) {
  const common = (
    <span className={cn("cn-species__common", species.displayIsScientific && "wrt-latin", size === "lg" && "text-[17px]")}>
      {species.displayName}
    </span>
  );
  const inner = (
    <span className="cn-species">
      {common}
      {!species.displayIsScientific && <span className="cn-species__latin">{species.scientificName}</span>}
    </span>
  );
  return link ? (
    <Link href={hrefs.species(species.slug)} className="!text-[var(--text-strong)] hover:!text-[var(--text-brand)]">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function PlaceName({ place, link = false }: { place: Place; link?: boolean }) {
  const label = (
    <span className="cn-species">
      <span className="cn-species__common">{place.name}</span>
      {place.isScheme && <span className="cn-species__latin is-plain">Order scheme, not a place</span>}
    </span>
  );
  return link ? (
    <Link href={hrefs.place(place.slug)} className="!text-[var(--text-strong)] hover:!text-[var(--text-brand)]">{label}</Link>
  ) : (
    label
  );
}

export function SiteClassBadge({ siteClass }: { siteClass: SiteClass }) {
  const tone = siteClass === "keystone" ? "brand" : siteClass === "school" ? "info" : siteClass === "community" ? "ok" : "soft";
  return <Badge tone={tone}>{SITE_CLASS_LABELS[siteClass]}</Badge>;
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const tone = confidence === "high" ? "ok" : confidence === "medium" ? "soft" : "risk";
  return <Badge tone={tone}>{CONFIDENCE_LABELS[confidence]}</Badge>;
}

export function PrecisionBadge({ precision }: { precision: Precision }) {
  return <Badge tone="soft" title={PRECISION_LABELS[precision].meaning}>{PRECISION_LABELS[precision].label}</Badge>;
}

export function ReviewBadge({ count, plants }: { count?: number; plants?: number }) {
  if (count !== undefined && count === 0) return null;
  return (
    <Badge tone="review">
      {plants !== undefined ? `${plants.toLocaleString("en-NZ")} need review` : count && count > 1 ? `${count} need review` : "Needs review"}
    </Badge>
  );
}
