import Link from "next/link";
import type { SpeciesProfile } from "@/lib/wrt/types";

/** Identification features and sources for compact species rows. */
export function SpeciesProfileSources({ profile, slug, includeLookFor = true }: { profile: SpeciesProfile | null; slug: string; includeLookFor?: boolean }) {
  if (!profile) return null;
  return (
    <details className="wrt-profile-preview__details">
      <summary>Identification &amp; sources</summary>
      <div className="wrt-profile-preview__more">
        {includeLookFor && <p><strong>What to look for.</strong> {profile.lookFor}</p>}
        <p className="wrt-profile-preview__sources">Sources: {profile.sources.map((source, i) => (
          <span key={source.url}>{i > 0 && " · "}<a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></span>
        ))}</p>
        <Link href={`/species/${slug}#about-species`}>Full species profile →</Link>
      </div>
    </details>
  );
}
