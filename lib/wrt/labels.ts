import type { Precision, SiteClass } from "./types";

export const SITE_CLASS_LABELS: Record<SiteClass, string> = {
  keystone: "Keystone",
  community: "Community",
  school: "School",
  unknown: "Not specified",
};

export const PRECISION_LABELS: Record<Precision, { label: string; meaning: string }> = {
  site: { label: "Site", meaning: "Recorded against a whole site." },
  subsite: { label: "Parcel", meaning: "Recorded against a registered parcel within a site." },
  area: { label: "Planting area", meaning: "Recorded against a named area inside a parcel." },
  scheme: { label: "Scheme", meaning: "Recorded against an order scheme, not a place." },
  unknown: { label: "Unknown", meaning: "The source column did not say where." },
};
