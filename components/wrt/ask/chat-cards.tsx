"use client";
/**
 * Draws each chat tool result with the components the site's own pages use:
 * site rows with species photo chips (Sites page), the field-guide card
 * (Species page) and the season row with top trees and top sites (Seasons page).
 * One case per tool in lib/wrt/chat-tools.ts. Add a tool there → add a case here.
 */
import Image from "next/image";
import { byTotalDesc } from "@/lib/wrt/queries";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { RankedBars, SeasonColumns } from "@/components/wrt/shared/charts";
import { hrefs } from "@/components/wrt/shared/names";
import { Card } from "@/components/wrt/shared/page";
import { QuantityFigure } from "@/components/wrt/shared/quantity";
import { SpeciesMarkers } from "@/components/wrt/species/species-meta";
import { SeasonRow } from "@/components/wrt/seasons/season-parts";
import { SiteRows, partHref, type SiteRowData } from "@/components/wrt/sites/site-rows";
import type { ChatMessage } from "@/lib/wrt/chat-tools";
import { REVIEW_THEMES } from "@/lib/wrt/review-themes";
import type { SpeciesPhoto } from "@/lib/wrt/species-photos";
import { spanLabel, formatNumber, formatShare } from "@/lib/wrt/text";
import type { QuantitySplit } from "@/lib/wrt/types";

type Part = ChatMessage["parts"][number];
type Out<N extends string> = Extract<Part, { type: `tool-${N}`; state: "output-available" }>["output"];
type Found<N extends string> = Extract<Out<N>, { found: true }>;

/** A tool call inside a message. */
type ToolCall = Extract<Part, { toolCallId: string }>;
export const isTool = (p: Part): p is ToolCall => p.type.startsWith("tool-");

/** One chip per lookup above the answer: spinning while it runs, a dot when done. Like the demo's steps. */
export function Steps({ parts }: { parts: Part[] }) {
  const calls = parts.filter(isTool);
  if (!calls.length) return null;
  return (
    <div className="wrt-chat__steps">
      {calls.map((p) => (
        <span key={p.toolCallId} className="wrt-chat__stepchip" data-state={p.state}>
          <i aria-hidden="true" />
          <b>{p.type.slice(5)}</b>
          {Object.entries((p.input ?? {}) as Record<string, unknown>)
            .filter(([, v]) => v != null && v !== "")
            .map(([k, v]) => (k === "groupBy" ? `by ${v}` : k === "q" ? `"${v}"` : String(v)))
            .join(" · ")}
        </span>
      ))}
    </div>
  );
}

export function ToolPart({ part, onAsk }: { part: Part; onAsk: (q: string) => void }) {
  if (!part.type.startsWith("tool-") || !("state" in part)) return null;
  if (part.state !== "output-available") return null; // Steps shows it running
  switch (part.type) {
    case "tool-search": return <SearchChips o={part.output} onAsk={onAsk} />;
    case "tool-place": return part.output.found ? <PlaceCard o={part.output} /> : null;
    case "tool-species": return part.output.found ? <PlantCard o={part.output} /> : null;
    case "tool-season": return part.output.found ? <SeasonCard o={part.output} /> : null;
    case "tool-records": return <RecordsCard o={part.output} />;
    case "tool-list": return <ListCard o={part.output} />;
    case "tool-data_quality": return <QualityCard o={part.output} />;
    default: return null;
  }
}

/** A Sites-page row for one place, without species chips. */
function placeRow(slug: string, name: string, split: QuantitySplit, meta: ReactNode, records: Record<string, string | number | undefined>): SiteRowData {
  return {
    key: slug, name, href: hrefs.place(slug), split, species: [], meta,
    totalHref: hrefs.records(records), moreHref: hrefs.place(slug), speciesHref: (s) => hrefs.species(s.slug),
  };
}

/**
 * A species link that remembers the site (and part) it was clicked from, so the sidebar can show
 * how many were recorded there and when. The full species page ignores the query.
 */
const speciesAtHref = (place?: string | null, part?: string | null) => (s: { slug: string }): `/species/${string}` =>
  place ? `${hrefs.species(s.slug)}?${new URLSearchParams(part ? { place, part } : { place })}` : hrefs.species(s.slug);

// ---- Follow-up questions: built from the card's own data, no extra model call.
// Shown under the newest answer and in the sidebar. Clicking one asks it.

const qs = (...xs: (string | false | null | undefined)[]) => xs.filter((x): x is string => !!x).slice(0, 4);

export function placeNext(o: Found<"place">) {
  const n = o.place.name;
  const parts = o.parts.length > 1 ? [...o.parts].sort(byTotalDesc).slice(0, 2) : [];
  return qs(
    ...parts.map((p) => `What's recorded at ${p.name} in ${n}?`),
    `Which plants am I most likely to see at ${n}?`,
    `Show me the top 3 plants at ${n}`,
    o.species[0] && `Tell me about ${o.species[0].item.displayName}`,
  );
}

export function speciesNext(o: Found<"species">) {
  const s = o.species.displayName;
  return qs(
    `When was ${s} recorded, season by season?`,
    o.places[0] && `What else was recorded at ${o.places[0].item.name}?`,
    o.places[1] && `Tell me about ${o.places[1].item.name}`,
  );
}

function recordsNext(o: Out<"records">) {
  const where = o.filter.place ? o.label.split(" · ")[0] : null; // label is "Place · Species · Season · Year"
  const at = where ? ` at ${where}` : "";
  const [top, second] = o.groups;
  if (o.groupBy === "season") return qs(o.groups.at(-1) && `What was recorded${at} in ${o.groups.at(-1)!.name}?`);
  if (o.groupBy === "place") return qs(top && `Tell me about ${top.name}`, second && `Tell me about ${second.name}`);
  return qs(
    top && `Tell me about ${top.name}`,
    o.groupCount > 1 && `Show me the top 3 plants${at}`,
    where && `Which plants am I most likely to see${at}?`,
    o.seasonCount > 1 && (where ? `When were the plants${at} recorded?` : "When were these recorded?"),
    where && !o.filter.parcel && `What are the parts of ${where}?`,
  );
}

export function nextQuestions(part: Part): string[] {
  if (!part.type.startsWith("tool-") || !("state" in part) || part.state !== "output-available") return [];
  switch (part.type) {
    case "tool-place": return part.output.found ? placeNext(part.output) : [];
    case "tool-species": return part.output.found ? speciesNext(part.output) : [];
    case "tool-season": return part.output.found
      ? qs(`Which species were recorded most in ${part.output.season.label}?`,
          part.output.places[0] && `What was recorded at ${part.output.places[0].item.name} in ${part.output.season.label}?`)
      : [];
    case "tool-records": return recordsNext(part.output);
    default: return [];
  }
}

export function Next({ questions, onAsk }: { questions: string[]; onAsk: (q: string) => void }) {
  if (!questions.length) return null;
  return (
    <div className="wrt-pills wrt-chat__next" aria-label="Follow-up questions">
      {questions.map((q) => <button key={q} type="button" className="cn-chip" onClick={() => onAsk(q)}>{q}</button>)}
    </div>
  );
}

/** Only shown when one name matched several species; the model asks which. */
function SearchChips({ o, onAsk }: { o: Out<"search">; onAsk: (q: string) => void }) {
  if (o.species.length < 2) return null;
  return (
    <div className="wrt-pills">
      {o.species.map((s) => (
        <button key={s.slug} type="button" className="cn-chip" onClick={() => onAsk(`Tell me about ${s.scientific}`)}>
          {s.name}
        </button>
      ))}
    </div>
  );
}

/** Sites page: the site row with its most recorded species as photo chips, then the season columns. */
export function PlaceCard({ o }: { o: Found<"place"> }) {
  const row: SiteRowData = {
    key: o.place.slug, name: o.place.name, href: hrefs.place(o.place.slug), isScheme: o.place.isScheme, split: o.split,
    species: o.species.map((r) => ({ species: r.item, split: r.split })),
    meta: `${o.span.first.label} → ${o.span.last.label} · ${o.span.seasonsActive} seasons · ${o.species.length} species`
      + (o.parcels.length > 1 ? ` · ${o.parcels.length} parts` : ""),
    totalHref: hrefs.records({ place: o.place.slug }), moreHref: hrefs.place(o.place.slug),
    speciesHref: speciesAtHref(o.place.slug),
  };
  return (
    <>
      <Card>
        <SiteRows rows={[row]} max={o.split.total} />
        <SeasonColumns points={o.seasons} size="sm" />
      </Card>
      {o.parts.length > 1 && (
        // Same as "Parts of this site" on the site page.
        <Card title={`Parts of this site (${o.parts.length})`}>
          <SiteRows
            max={Math.max(1, ...o.parts.map((p) => p.split.total))}
            top={3}
            rows={o.parts.map((p) => {
              const href = partHref(o.place.slug, p.name);
              return {
                key: p.name, name: p.name, href, split: p.split, species: p.species,
                meta: spanLabel(p.span)
                  + ` · ${p.span.seasonsActive} ${p.span.seasonsActive === 1 ? "season" : "seasons"} · ${p.speciesCount} species`,
                totalHref: href, moreHref: href, speciesHref: speciesAtHref(o.place.slug, p.name),
              };
            })}
          />
        </Card>
      )}
    </>
  );
}

/** A reference photo. Its attribution stays hidden until it's hovered, focused or tapped. */
function Photo({ photo, alt, sizes }: { photo: SpeciesPhoto; alt: string; sizes: string }) {
  return (
    <figure className="wrt-chat__photo" tabIndex={0}>
      <Image src={photo.src} width={960} height={720} sizes={sizes} unoptimized
        alt={alt} className="wrt-chat__photo-img" />
      <figcaption className="wrt-chat__photo-credit">
        Photo: {photo.attribution}
      </figcaption>
    </figure>
  );
}

/** Names, flags, profile, totals. Shared by the chat card and the sidebar. */
function PlantBody({ o, inChat }: { o: Found<"species">; inChat?: boolean }) {
  const here = o.here;
  if (!o.span) return null;
  const sp = o.species;
  const { first, last } = o.span;
  const years = first.year === last.year ? `${first.year}` : `${first.year}–${last.year}`;
  const name = <span className={sp.displayIsScientific ? "wrt-scard__common italic" : "wrt-scard__common"}>{sp.displayName}</span>;
  return (
    <div className="wrt-scard__body">
      <h3 className="wrt-scard__name">
        {/* In the chat the whole card opens the sidebar; in the sidebar the name is just a heading. */}
        {inChat ? <Link href={speciesAtHref(here?.place, here?.part)(sp)} className="wrt-scard__link">{name}</Link> : name}
        {!sp.displayIsScientific && <span className="wrt-scard__latin">{sp.scientificName}</span>}
      </h3>
      <SpeciesMarkers species={sp} />

      {here && (
        <p className="wrt-chat__plant-here">
          <strong>{here.split.total ? `${formatNumber(here.split.total)} recorded` : "None recorded"}</strong> at {here.label}
          {here.split.needsReview > 0 && <span className="wrt-scard__review"> · {formatNumber(here.split.needsReview)} need review</span>}
          {here.first && ` · ${here.first === here.last ? here.first : `${here.first} → ${here.last}`}`}
        </p>
      )}
      {!inChat && here && here.seasons.length > 1 && (
        // The sidebar spells out each season at this site; the chat card keeps to first → last.
        <div className="wrt-pills wrt-chat__seasons">
          {here.seasons.map((x) => <span key={x.label} className="cn-chip">{x.label} <b className="tabular-nums">{formatNumber(x.total)}</b></span>)}
        </div>
      )}
      {o.profile && <p className="wrt-chat__plant-summary">{o.profile.summary}</p>}

      {/* The same facts strip as the species page rows. */}
      <dl className="wrt-scard__facts">
        <div>
          <dt>Recorded</dt>
          <dd className="tabular-nums">
            {formatNumber(o.split.total)}
            {o.split.needsReview * 2 > o.split.total && <span className="wrt-scard__unsure">mostly unconfirmed</span>}
          </dd>
        </div>
        <div><dt>Sites</dt><dd>{o.places.length}</dd></div>
        <div><dt>Seasons</dt><dd>{years}</dd></div>
      </dl>

      {inChat && o.places.length > 0 && (
        <p className="wrt-chat__plant-where wrt-scard__above">
          Most at{" "}
          {o.places.slice(0, 3).map((r, i) => (
            <Fragment key={r.item.slug}>
              {i > 0 && " · "}
              <Link href={hrefs.place(r.item.slug)}>{r.item.name}</Link> {formatNumber(r.split.total)}
            </Fragment>
          ))}
        </p>
      )}
    </div>
  );
}

/**
 * One plant in the chat: the field-guide card laid sideways. Photo, names, a two-line profile, its count at the
 * site being asked about, its totals and top three sites. The whole card opens the full guide in the sidebar.
 */
function PlantCard({ o }: { o: Found<"species"> }) {
  if (!o.span) return null;
  const photo = o.photos[0];
  return (
    <article className="wrt-scard wrt-chat__plant">
      <div className="wrt-scard__media">
        {photo
          ? <Photo photo={photo} sizes="200px" alt={`Reference photo of ${o.species.displayName}`} />
          : <span className="wrt-chat__plant-initial" aria-hidden="true">{o.species.displayName.charAt(0)}</span>}
        <span className="wrt-scard__rank" title={`Number ${o.rank} by recorded plants`}>{o.rank}</span>
      </div>
      <PlantBody o={o} inChat />
    </article>
  );
}

/** The sidebar's species view: photos together (one big, two small), the guide, then where it was recorded. */
export function SpeciesCard({ o }: { o: Found<"species"> }) {
  if (!o.span) return null;
  const [big, ...small] = o.photos;
  const alt = `Reference photo of ${o.species.displayName}`;
  return (
    <div className="wrt-chat__guide">
      {big && (
        <div className="wrt-chat__gallery">
          <Photo photo={big} sizes="560px" alt={alt} />
          {small.slice(0, 2).map((p) => <Photo key={p.src} photo={p} sizes="280px" alt={alt} />)}
        </div>
      )}
      <PlantBody o={o} />
      <Card title="Where it was recorded">
        <SiteRows
          rows={o.places.slice(0, 6).map((r) => placeRow(
            r.item.slug, r.item.name, r.split, `${formatShare(r.split.total, o.split.total)} of this species`,
            { place: r.item.slug, species: o.species.slug },
          ))}
          max={o.places[0]?.split.total ?? 1}
        />
      </Card>
    </div>
  );
}

/** Seasons page: the season row with top trees (photos) and top sites (pins). */
function SeasonCard({ o }: { o: Found<"season"> }) {
  return (
    <ol className="wrt-srows">
      <SeasonRow
        s={{ season: o.season, split: o.split, placeCount: o.places.length, speciesCount: o.species.length, reconciliation: o.reconciliation }}
        fewSites={false}
        trees={o.species.slice(0, 3).map((r) => ({ species: r.item, split: r.split }))}
        sites={o.places.slice(0, 3).map((r) => ({ slug: r.item.slug, name: r.item.name, split: r.split }))}
      />
    </ol>
  );
}

/** Totals for a filter: species as photo chips, places as site rows, seasons as bars. */
function RecordsCard({ o }: { o: Out<"records"> }) {
  const all = hrefs.records({ ...o.filter });
  // When: the only dates the data has are seasons.
  const when = !o.first ? "" : o.first === o.last ? o.first : `${o.first} → ${o.last} · ${o.seasonCount} seasons`;
  if (o.groupBy === "species") {
    const row: SiteRowData = {
      key: "records", name: o.label, href: all, split: o.split,
      species: o.groups.flatMap((g) => (g.species ? [{ species: g.species, split: g.split }] : [])),
      meta: [when, `${o.groupCount} species`, `${o.split.records} records`].filter(Boolean).join(" · "),
      totalHref: all, moreHref: all, speciesHref: speciesAtHref(o.filter.place, o.filter.parcel ? o.label.split(" · ")[0] : null),
    };
    return <Card><SiteRows rows={[row]} max={o.split.total} top={12} /></Card>;
  }
  if (o.groupBy === "place") {
    return (
      <Card title={o.label}>
        <SiteRows
          rows={o.groups.map((g) => placeRow(g.slug, g.name, g.split, `${formatShare(g.split.total, o.split.total)} of these`, { ...o.filter, place: g.slug }))}
          max={o.groups[0]?.split.total ?? 1}
        />
      </Card>
    );
  }
  // "When": one site-style row (what · seasons · total), then a chip per season if there was more than one.
  // Kept to one row so several in a row ("when were they introduced?") stay a short list.
  const row: SiteRowData = {
    key: "when", name: o.label, href: all, split: o.split, species: [],
    meta: [when, `${o.split.records} ${o.split.records === 1 ? "record" : "records"}`].filter(Boolean).join(" · "),
    totalHref: all, moreHref: all, speciesHref: (s) => hrefs.species(s.slug),
  };
  return (
    <Card>
      <SiteRows rows={[row]} max={o.split.total} />
      {o.groups.length > 1 && (
        <div className="wrt-pills wrt-chat__seasons">
          {o.groups.map((g) => (
            <span key={g.slug} className="cn-chip" title={g.split.needsReview ? `${formatNumber(g.split.needsReview)} need review` : undefined}>
              {g.name} <b className="tabular-nums">{formatNumber(g.split.total)}</b>
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

function ListCard({ o }: { o: Out<"list"> }) {
  if (o.kind === "places") {
    return (
      <Card title="All sites">
        <SiteRows
          rows={o.rows.map((r) => placeRow(r.slug, r.name, r.split, `${r.first} → ${r.last}`, { place: r.slug }))}
          max={Math.max(1, ...o.rows.map((r) => r.split.total))}
        />
      </Card>
    );
  }
  return (
    <Card title={`All ${o.kind}`}>
      <RankedBars items={o.rows.map((r) => ({
        key: r.slug,
        label: "first" in r ? `${r.name} · ${r.first} → ${r.last}` : r.name,
        split: r.split,
        href: o.kind === "species" ? hrefs.species(r.slug) : hrefs.season(r.slug),
      }))} />
    </Card>
  );
}

function QualityCard({ o }: { o: Out<"data_quality"> }) {
  return (
    <Card title="Waiting on a WRT ruling" foot="Reasons overlap, so they don't add up to the total.">
      <QuantityFigure split={o.split} size="md" />
      <RankedBars items={o.themes.map((t) => ({
        key: t.theme, label: REVIEW_THEMES[t.theme].label, split: t.split,
        href: hrefs.records({ review: "needs-review", theme: t.theme }),
      }))} />
    </Card>
  );
}
