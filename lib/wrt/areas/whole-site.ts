/**
 * A site's area for plants saved at the site as a whole, when it has several areas (or none): no WRT number and
 * no pin, and never offered as a part (see eventFormOptions). Its plants count in the site's totals.
 */
export const wholeSiteAreaSlug = (site: string) => `${site}-whole-site`;
