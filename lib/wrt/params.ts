/** URL search params as Next hands them to a page. */
export type RawParams = Record<string, string | string[] | undefined>;

/** The first value of a repeated param (?year=2019&year=2020), or the value itself. */
export const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
