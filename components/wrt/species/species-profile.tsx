import { getSpeciesProfile, type SpeciesProfile } from "@/lib/wrt/species-profiles";
import { Card } from "@/components/wrt/page";
import "./species-profile.css";
import { SpeciesReferenceStatus } from "./species-reference-status";
import { getSpeciesReferenceReview } from "@/lib/wrt/species-reference-reviews";

/** Reused by the photo guide and species detail pages. */
export function SpeciesProfileContent({ profile }: { profile: SpeciesProfile }) {
  return (
    <div className="wrt-profile">
      <dl className="wrt-profile__names">
        <div><dt>Common name</dt><dd>{profile.commonName ?? <span className="wrt-profile__unknown">Not recorded in the sources checked.</span>}</dd></div>
        <div><dt>Botanical name</dt><dd><i>{profile.scientificName}</i></dd></div>
        <div><dt>Māori {profile.maoriNames.length > 1 ? "names" : "name"}</dt>
          <dd>{profile.maoriNames.length ? profile.maoriNames.join(" · ") : <span className="wrt-profile__unknown">Not recorded in the sources checked.</span>}</dd>
        </div>
      </dl>
      {profile.nameNote && <p className="wrt-profile__note">{profile.nameNote}</p>}
      <p>{profile.summary}</p>
      <p><strong>What to look for.</strong> {profile.lookFor}</p>
      <p className="wrt-profile__sources">Sources: {profile.sources.map((source, i) => (
        <span key={source.url}>{i > 0 && " · "}<a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></span>
      ))}</p>
    </div>
  );
}

export function SpeciesProfilePanel({ speciesId }: { speciesId: string }) {
  const profile = getSpeciesProfile(speciesId);
  if (!profile && !getSpeciesReferenceReview(speciesId)) return null;
  if (!profile) return (
    <Card id="about-species" title="Species reference review">
      <SpeciesReferenceStatus speciesId={speciesId} />
    </Card>
  );
  return (
    <Card id="about-species" title={`About ${profile.commonName ?? profile.scientificName}`}>
      <SpeciesProfileContent profile={profile} />
      <SpeciesReferenceStatus speciesId={speciesId} />
    </Card>
  );
}
