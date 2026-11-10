/** Shared string limits for form controls and validation at request boundaries. */
export const INPUT_LIMITS = {
  identifier: 80,
  shortText: 255,
  url: 2048,
  longText: 2000,
} as const;

export const lengthMessage = (limit: number) => `Use at most ${limit} characters.`;
