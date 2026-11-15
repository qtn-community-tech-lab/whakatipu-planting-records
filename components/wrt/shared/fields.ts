import type { KeyboardEvent } from "react";

/**
 * What a phone's keyboard should leave alone. Names here are site, location, area and species names, often
 * Māori or Latin, which autocorrect "fixes" and the suggestion bar guesses wrongly; the
 * browser's own list of things typed before only gets in the way.
 */
const PLAIN = { autoComplete: "off", autoCorrect: "off", spellCheck: false } as const;

/**
 * NAME_FIELD is for a site, location or area, never a person. A phone offers the owner's own name to any
 * field that looks like a name field and ignores autoComplete="off" there. So give each such input
 * an explicit non-person `name` (e.g. "polygon-label"), never "name", and keep the word "name" out of
 * its label and placeholder too: iOS reads those and offers AutoFill Contact. Keep these off password managers too.
 */

/** A name being typed (a location, an area): each word starts with a capital. */
export const NAME_FIELD = { ...PLAIN, autoCapitalize: "words", "data-1p-ignore": true, "data-lpignore": "true" } as const;

/** A whole number (a quantity, a year). Text with the number pad, not type="number": that one
    changes under a scroll wheel and lets "e", "+", "-" and "." through. Keep only `digits` of what's typed. */
export const NUMBER_FIELD = { type: "text", inputMode: "numeric", pattern: "[0-9]*", autoComplete: "off" } as const;
export const digits = (typed: string) => typed.replace(/\D/g, "");

/**
 * For a form's onKeyDown. Enter in a one-line field must not send the form: on a phone it is the
 * keyboard's own key, pressed to say "done with this field". It goes to the next field marked
 * `data-enter-next` after one so marked (a column of quantities), and otherwise puts the keyboard away.
 */
export function enterStaysInField(e: KeyboardEvent<HTMLFormElement>) {
  const field = e.target as HTMLElement;
  if (e.key !== "Enter" || e.defaultPrevented || !(field instanceof HTMLInputElement)) return;
  e.preventDefault();
  const column = field.hasAttribute("data-enter-next") ? [...e.currentTarget.querySelectorAll<HTMLInputElement>("input[data-enter-next]")] : [];
  const next = column[column.indexOf(field) + 1];
  if (next) next.focus();
  else field.blur();
}
