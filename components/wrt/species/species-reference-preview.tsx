import Link from "next/link";
import type { Species } from "@/lib/wrt/types";

/** Identification features and sources for compact species rows. */
export function SpeciesReferenceSources({ species, includeLookFor = true }: { species: Species; includeLookFor?: boolean }) {
  if (!species.sources.length) return null;
  return (
    <details className="wrt-profile-preview__details">
      <summary>Identification &amp; sources</summary>
      <div className="wrt-profile-preview__more">
        {includeLookFor && species.lookFor && <p><strong>What to look for.</strong> {species.lookFor}</p>}
        <p className="wrt-profile-preview__sources">Sources: {species.sources.map((source, i) => (
          <span key={source.url}>{i > 0 && " · "}<a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></span>
        ))}</p>
        <Link href={`/species/${species.slug}#about-species`}>Full species reference →</Link>
      </div>
    </details>
  );
}
