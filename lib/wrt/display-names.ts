/**
 * Display overlay for species names.
 *
 * The source species register has no macrons anywhere (discovery 04a §1).
 * Canopy says te reo Māori is always displayed with macrons, so this overlay
 * restores them word by word for display ONLY. It never changes join keys,
 * and search folds macrons on both sides, so "manuka" and "mānuka" both match.
 *
 * Only well-attested spellings are listed. Anything not listed is shown as the
 * register spells it. WRT should confirm this list when the species register
 * gains its own display-name column; at that point delete this file.
 */
const WORD_MACRONS: Record<string, string> = {
  manuka: "mānuka",
  kanuka: "kānuka",
  kowhai: "kōwhai",
  ti: "tī",
  kouka: "kōuka",
  kamahi: "kāmahi",
  matai: "mataī",
  purei: "pūrei",
  pukio: "pūkio",
  makaka: "mākaka",
  putaputaweta: "putaputawētā",
  karamu: "karamū",
  pokaka: "pōkākā",
  kotukutuku: "kōtukutuku",
  kapuka: "kāpuka",
  rohutu: "rōhutu",
  rata: "rātā",
  pohuehue: "pōhuehue",
  kaikomako: "kaikōmako",
  manatu: "mānatu",
  totara: "tōtara",
  turepo: "tūrepo",
  // Typos in the proposed register's common-name column (display only; raw spellings stay searchable).
  dasiy: "daisy",
  fuscia: "fuchsia",
  ribonwood: "ribbonwood",
};

/** Whole-name rewrites where the source splits or joins words differently. */
const NAME_REWRITES: Record<string, string> = {
  "toe toe": "toetoe",
};

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * "Ti kouka" → "Tī kōuka"; "Halls Totara" → "Halls tōtara".
 * Keeps sentence case: first letter upper, macron words lower.
 */
export function withMacrons(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const rewritten = NAME_REWRITES[trimmed.toLowerCase()] ?? trimmed;
  const words = rewritten.split(/(\s+|,\s*)/);
  const out = words
    .map((w) => {
      const key = w.toLowerCase();
      return WORD_MACRONS[key] ?? w;
    })
    .join("");
  return capitalise(out);
}

/**
 * "Purei, or Pukio" → "Pūrei". The register sometimes lists alternatives;
 * the first is the display name, the rest stay searchable.
 */
export function primaryName(name: string | null): string | null {
  if (!name) return null;
  const first = name.split(/,\s*or\s+|\s+or\s+|,\s*/i)[0]?.trim();
  return first ? first : null;
}
