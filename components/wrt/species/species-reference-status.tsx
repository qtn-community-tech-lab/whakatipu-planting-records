import { getSpeciesReferenceReview } from "@/lib/wrt/species-reference-reviews";

/** Show genuine reference gaps without suggesting that planting data is missing. */
export function SpeciesReferenceStatus({ speciesId }: { speciesId: string }) {
  const review = getSpeciesReferenceReview(speciesId);
  if (!review || review.status === "confirmed") return null;
  return (
    <p className="wrt-muted m-0 text-sm" data-reference-status={review.status}>
      <strong>{review.photoCount} of 3 reference photos confirmed.</strong>{" "}{review.summary ?? review.reason}
    </p>
  );
}
