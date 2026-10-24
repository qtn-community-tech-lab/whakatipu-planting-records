/**
 * Plain-English labels for review themes and site classes.
 * Client-safe: no data access here.
 */
import type { Confidence, Precision, ReviewTheme, SiteClass } from "./csv/types";

export const REVIEW_THEMES: Record<ReviewTheme, { label: string; question: string }> = {
  "slope-hill-2024": {
    label: "Slope Hill 2024 columns",
    question: "Were the 22,000 Slope Hill HGF and 7,000 Coronation plants real plantings, and should they count?",
  },
  "contested-species": {
    label: "Contested species pairs",
    question: "Are these names one species line or two? Each name is kept as typed until WRT rules.",
  },
  "order-scheme": {
    label: "Paper4Trees is an order scheme",
    question: "Paper4Trees is a scheme, not a place. How should its plants count?",
  },
  "site-number-mismatch": {
    label: "Site number disagrees with the register",
    question: "The MASTER column carries a different site number from the register. Which one is right?",
  },
  "new-site": {
    label: "Site with no WRT number",
    question: "Is this a new site, and what number should it get?",
  },
  "site-identity": {
    label: "Uncertain site",
    question: "The column header does not say clearly which site or parcel it means.",
  },
  "header-cleaned": {
    label: "Site header carried extra text",
    question: "Confirm the cleaned site name is the right site.",
  },
  "not-a-number": {
    label: "Cell is not a number",
    question: "The cell holds text such as 'TBC'. No quantity was imported.",
  },
  other: {
    label: "Other check",
    question: "See the note on each record.",
  },
};

export const SITE_CLASS_LABELS: Record<SiteClass, string> = {
  keystone: "Keystone",
  community: "Community",
  school: "School",
  unknown: "Not a site",
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

export const PRECISION_LABELS: Record<Precision, { label: string; meaning: string }> = {
  site: { label: "Site", meaning: "Recorded against a whole site." },
  subsite: { label: "Parcel", meaning: "Recorded against a registered parcel within a site." },
  area: { label: "Planting area", meaning: "Recorded against a named area inside a parcel (2026 only)." },
  scheme: { label: "Scheme", meaning: "Recorded against an order scheme, not a place." },
  unknown: { label: "Unknown", meaning: "The source column did not say where." },
};
