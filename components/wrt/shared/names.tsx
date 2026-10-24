/**
 * Names and labels. IDs are never rendered: users see names.
 */
import Link from "next/link";
import type { Place, Precision, Species } from "@/lib/wrt/types";
import { PRECISION_LABELS } from "@/lib/wrt/labels";
import { Badge } from "@/components/ui/badge";
import { seasonPathKey } from "@/lib/wrt/text";
import { cn } from "@/lib/utils";

export const hrefs = {
  place: (slug: string) => `/sites/${slug}`,
  species: (slug: string) => `/species/${slug}`,
  season: (slug: string) => `/seasons/${seasonPathKey(slug)}`,
  records: (params: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && (v !== "" || k === "season")) sp.set(k, String(v));
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

export function PrecisionBadge({ precision }: { precision: Precision }) {
  return <Badge tone="soft" title={PRECISION_LABELS[precision].meaning}>{PRECISION_LABELS[precision].label}</Badge>;
}

/** Link target for every threatened mark: the About the data section that explains it. */
export const THREATENED_HREF = "/about-the-data#threatened";

export function threatenedState(species: Species): "both" | "one" | null {
  const m = species.threatenedMarks;
  if (m.plantsOutMaster && m.teKakano) return "both";
  if (m.plantsOutMaster || m.teKakano) return "one";
  return null;
}

export const THREATENED_TITLE =
  "WRT marks this species threatened, but no file says which threat list or year the mark comes from. See About the data.";

/**
 * WRT's threatened mark, always flagged: the basis is not recorded and WRT's two
 * lists disagree, so it is never shown as a settled conservation status.
 */
export function ThreatenedBadge({ species }: { species: Species }) {
  const state = threatenedState(species);
  if (!state) return null;
  return (
    <Link href={THREATENED_HREF} title={THREATENED_TITLE} className="!no-underline">
      <Badge tone="soft">
        {state === "both" ? "Marked threatened · basis unknown" : "Marked threatened in one WRT list"}
      </Badge>
    </Link>
  );
}
