/**
 * A site's area for plants saved at the site as a whole, when it has several areas (or none): no WRT number and
 * no pin, and never offered as a part (see eventFormOptions). Its plants count in the site's totals.
 */
export const wholeSiteAreaSlug = (site: string) => `${site}-whole-site`;

/**
 * The area a planting goes in: the chosen part's (its WRT number, or its slug when it has none), or for the site as
 * a whole its site-wide area, or its only area. Undefined when there's none yet.
 */
export function areaFor(areas: readonly { slug: string; wrt_number: string | null }[], site: string, partId: string | null) {
  if (partId !== null) return areas.find((a) => (a.wrt_number ?? a.slug) === partId)?.slug;
  return (areas.find((a) => a.slug === wholeSiteAreaSlug(site)) ?? (areas.length === 1 ? areas[0] : undefined))?.slug;
}
