/**
 * Ready-made joins and totals. Every total keeps the split the app insists on:
 * plants = plants resolved + plants needing review. Retired rows are left out.
 * security_invoker: the reader's own access rules apply.
 */
import { sql } from "drizzle-orm";
import { bigint, boolean, date, integer, pgView, smallint, text } from "drizzle-orm/pg-core";
import { eventSource, siteClass } from "./enums";

const active = sql.raw(`l.deactivated_at is null and e.deactivated_at is null`);
const joins = sql.raw(`
  from public.planting_lines l
  join public.planting_events e on e.id = l.event_id
  join public.seasons se       on se.id = e.season_id
  join public.site_areas a     on a.id = e.site_area_id
  join public.sites si         on si.id = a.site_id
  join public.species sp       on sp.id = l.species_id`);
const split = sql.raw(`
  coalesce(sum(l.quantity), 0)                                 as plants,
  coalesce(sum(l.quantity) filter (where not l.needs_review), 0) as plants_resolved,
  coalesce(sum(l.quantity) filter (where l.needs_review), 0)   as plants_needs_review,
  count(*)                                                     as lines,
  count(*) filter (where l.needs_review)                       as lines_needs_review`);
const splitColumns = {
  plants: bigint({ mode: "number" }),
  plantsResolved: bigint({ mode: "number" }),
  plantsNeedsReview: bigint({ mode: "number" }),
  lines: bigint({ mode: "number" }),
  linesNeedsReview: bigint({ mode: "number" }),
};

/** One row per active line, with its event, season, site, area and species joined in. */
export const lineDetails = pgView("line_details", {
  lineId: integer(), eventId: integer(), legacyCode: text(), source: eventSource(),
  season: text(), seasonLabel: text(), year: smallint(), seasonOrder: smallint(), plantingDate: date(),
  site: text(), siteName: text(), isScheme: boolean(),
  area: text(), areaName: text(), wrtNumber: text(), siteClass: siteClass(),
  species: text(), scientificName: text(), commonName: text(), maoriName: text(),
  over5m: boolean("over_5m"), threatened: boolean(), contestedGroup: text(),
  quantity: integer(), needsReview: boolean(),
}).with({ securityInvoker: true }).as(sql`
  select l.id as line_id, e.id as event_id, l.legacy_code, e.source,
    se.slug as season, se.label as season_label, se.year, se.sort_order as season_order, e.planting_date,
    si.slug as site, si.name as site_name, si.is_scheme,
    a.slug as area, a.name as area_name, a.wrt_number, a.site_class,
    sp.slug as species, sp.scientific_name, sp.common_name, sp.maori_name,
    sp.over_5m, sp.threatened, sp.contested_group,
    l.quantity, l.needs_review
  ${joins} where ${active}`);

export const totalsBySite = pgView("totals_by_site", {
  site: text(), siteName: text(), isScheme: boolean(), ...splitColumns,
  species: bigint({ mode: "number" }), firstSeasonOrder: smallint(), lastSeasonOrder: smallint(),
}).with({ securityInvoker: true }).as(sql`
  select si.slug as site, si.name as site_name, si.is_scheme, ${split},
    count(distinct sp.id) as species, min(se.sort_order) as first_season_order, max(se.sort_order) as last_season_order
  ${joins} where ${active} group by si.id`);

export const totalsBySpecies = pgView("totals_by_species", {
  species: text(), scientificName: text(), commonName: text(), maoriName: text(), ...splitColumns,
  sites: bigint({ mode: "number" }),
}).with({ securityInvoker: true }).as(sql`
  select sp.slug as species, sp.scientific_name, sp.common_name, sp.maori_name, ${split},
    count(distinct si.id) as sites
  ${joins} where ${active} group by sp.id`);

export const totalsBySeason = pgView("totals_by_season", {
  season: text(), seasonLabel: text(), seasonOrder: smallint(), ...splitColumns,
  sites: bigint({ mode: "number" }), species: bigint({ mode: "number" }),
}).with({ securityInvoker: true }).as(sql`
  select se.slug as season, se.label as season_label, se.sort_order as season_order, ${split},
    count(distinct si.id) as sites, count(distinct sp.id) as species
  ${joins} where ${active} group by se.id`);

/** What is waiting on WRT, by question. A line can sit under two topics: rows overlap, don't add them. */
export const totalsByReviewTopic = pgView("totals_by_review_topic", {
  topic: text(), label: text(), question: text(), decision: text(),
  plantsNeedsReview: bigint({ mode: "number" }), linesNeedsReview: bigint({ mode: "number" }),
}).with({ securityInvoker: true }).as(sql`
  with flagged as (
    select distinct n.topic_id, l.id, l.quantity
    from public.line_notes n join public.planting_lines l on l.id = n.line_id
    where l.needs_review and n.kind <> 'fyi' and n.deactivated_at is null and l.deactivated_at is null)
  select t.slug as topic, t.label, t.question, t.decision,
    coalesce(sum(f.quantity), 0) as plants_needs_review, count(f.id) as lines_needs_review
  from public.review_topics t left join flagged f on f.topic_id = t.id
  group by t.id`);
