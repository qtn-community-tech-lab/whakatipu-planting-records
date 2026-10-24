import { Fragment } from "react";
import type { Species } from "@/lib/wrt/types";
import { Card } from "@/components/wrt/shared/page";

/** Plain database text, with clickable HTTP(S) sources and attribution; never HTML. */
export function Description({ text }: { text: string }) {
  return <div className="wrt-profile">{text.split(/\n\s*\n/).filter(Boolean).map((paragraph, i) => <p key={i} className="whitespace-pre-line">{paragraph.split(/(https?:\/\/[^\s]+)/g).map((part, j) => /^https?:\/\//.test(part) ? <a key={j} href={part} target="_blank" rel="noreferrer">{part}</a> : <Fragment key={j}>{part}</Fragment>)}</p>)}</div>;
}
export function SpeciesProfilePanel({ species }: { species: Species }) {
  if (!species.description && !species.note) return null;
  return <Card id="about-species" title={`About ${species.displayName}`}><Description text={species.description} />{species.note && <p className="wrt-rule">{species.note}</p>}</Card>;
}
