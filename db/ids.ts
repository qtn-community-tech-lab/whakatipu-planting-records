import { z } from "zod";

/** Total length, including the three-letter prefix and underscore. */
export const DOMAIN_ID_LENGTH = 16;

/** Shared by every table's IDs and foreign keys; matches the SQL length constraint. */
export const domainId = z.string().length(DOMAIN_ID_LENGTH, `ID must be ${DOMAIN_ID_LENGTH} characters`);
export type DomainId = z.infer<typeof domainId>;

export const IdPrefixes = {
  USER: "usr",
  LOCATION: "loc",
  SITE: "sit",
  PLANTING_AREA: "are",
  SPECIES: "spc",
  PLANTING_EVENT: "pev",
  PLANTING_EVENT_SPECIES: "pes",
} as const;

/** One of the prefix values above, such as "usr" or "spc". */
export type IdPrefix = (typeof IdPrefixes)[keyof typeof IdPrefixes];

const RANDOM_ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/**
 * Create a new random ID: a three-letter prefix, an underscore and 12 characters.
 * Generate it once when creating a record, then store and reuse it for edits.
 *
 * @example generateUniqueID(IdPrefixes.SPECIES) // "spc_6n8k2j4m9q0r"
 */
export function generateUniqueID(resourceType: IdPrefix): string {
  const prefix = `${resourceType}_`;
  const suffixLength = DOMAIN_ID_LENGTH - prefix.length;
  const randomBytes = crypto.getRandomValues(new Uint8Array(suffixLength));

  let suffix = "";
  for (const byte of randomBytes) {
    // The remainder gives an index within our alphabet of digits and letters.
    const characterIndex = byte % RANDOM_ID_ALPHABET.length;
    suffix += RANDOM_ID_ALPHABET[characterIndex];
  }

  return prefix + suffix;
}
