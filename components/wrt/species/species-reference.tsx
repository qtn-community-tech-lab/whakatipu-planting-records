import type { Species } from "@/lib/wrt/types";
import { Card } from "@/components/wrt/shared/page";
import { SpeciesReferenceStatus } from "./species-reference-status";
import { getSpeciesReferenceReview } from "@/lib/wrt/species-reference-reviews";

/** Reused by the photo guide and species detail pages. */
export function SpeciesReferenceContent({ species }: { species: Species }) {
  const maoriNames = [...new Set([...(species.maoriName ? [species.maoriName] : []), ...species.maoriNameAlternatives])];
  return (
    <div className="wrt-profile">
      <dl className="wrt-profile__names">
        <div><dt>Common name</dt><dd>{species.commonName ?? <span className="wrt-profile__unknown">Not recorded in the sources checked.</span>}</dd></div>
        <div><dt>Botanical name</dt><dd><i>{species.scientificName}</i></dd></div>
        <div><dt>Māori {maoriNames.length > 1 ? "names" : "name"}</dt>
          <dd>{maoriNames.length ? maoriNames.join(" · ") : <span className="wrt-profile__unknown">Not recorded in the sources checked.</span>}</dd>
        </div>
      </dl>
      {species.summary && <p>{species.summary}</p>}
      {species.lookFor && <p><strong>What to look for.</strong> {species.lookFor}</p>}
      {species.sources.length > 0 && <p className="wrt-profile__sources">Sources: {species.sources.map((source, i) => (
        <span key={source.url}>{i > 0 && " · "}<a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></span>
      ))}</p>}
    </div>
  );
}

export function SpeciesReferencePanel({ species }: { species: Species }) {
  const hasReference = species.summary !== null || species.lookFor !== null || species.sources.length > 0;
  if (!hasReference && !getSpeciesReferenceReview(species.id)) return null;
  if (!hasReference) return (
    <Card id="about-species" title="Species reference review">
      <SpeciesReferenceStatus speciesId={species.id} />
    </Card>
  );
  return (
    <Card id="about-species" title={`About ${species.commonName ?? species.scientificName}`}>
      <SpeciesReferenceContent species={species} />
      <SpeciesReferenceStatus speciesId={species.id} />
    </Card>
  );
}
