import catalogue from "@/data/species-reference-reviews.json";

/** Research outcomes are separate from WRT's unresolved planting records. */
export interface SpeciesReferenceReview {
  speciesId: string;
  scientificName: string;
  status: "confirmed" | "partial" | "unresolved";
  photoCount: number;
  reason: string;
  summary?: string;
  checkedAt: string;
}

export const speciesReferenceReviews = catalogue as readonly SpeciesReferenceReview[];
const byId = new Map(speciesReferenceReviews.map((review) => [review.speciesId, review]));
export const getSpeciesReferenceReview = (speciesId: string) => byId.get(speciesId);
