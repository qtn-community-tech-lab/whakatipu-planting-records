import Link from "next/link";
import { getSpeciesProfile } from "@/lib/wrt/species-profiles";
import "./species-profile-preview.css";

/** Names and a short introduction directly in the species listing. */
export function SpeciesProfilePreview({ speciesId, slug }: { speciesId: string; slug: string }) {
  const profile = getSpeciesProfile(speciesId);
  if (!profile) return null;

  return (
    <div className="wrt-profile-preview">
      <dl className="wrt-profile-preview__names">
        <div><dt>Common name</dt><dd>{profile.commonName ?? "Not recorded in the sources checked."}</dd></div>
        <div><dt>Māori {profile.maoriNames.length > 1 ? "names" : "name"}</dt>
          <dd>{profile.maoriNames.length ? profile.maoriNames.join(" · ") : "Not recorded in the sources checked."}</dd>
        </div>
      </dl>
      <p>{profile.summary}</p>
      <details className="wrt-profile-preview__details">
        <summary>Identification &amp; sources</summary>
        <div className="wrt-profile-preview__more">
          {profile.nameNote && <p className="wrt-profile-preview__note">{profile.nameNote}</p>}
          <p><strong>What to look for.</strong> {profile.lookFor}</p>
          <p className="wrt-profile-preview__sources">Sources: {profile.sources.map((source, i) => (
            <span key={source.url}>{i > 0 && " · "}<a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></span>
          ))}</p>
          <Link href={`/species/${slug}#about-species`}>Full species profile →</Link>
        </div>
      </details>
    </div>
  );
}
