/**
 * "What went in during <year>" for one site: the species recorded that year,
 * using only events with a saved planting date.
 */
import Link from "next/link";
import type { RecordView } from "@/lib/wrt/queries";
import { byTotalDesc, splitOf } from "@/lib/wrt/queries";
import type { Place, Species } from "@/lib/wrt/types";
import { formatNumber } from "@/lib/wrt/text";
import { Card, CardLink } from "@/components/wrt/shared/page";
import { hrefs } from "@/components/wrt/shared/names";
import { QuantityFigure } from "@/components/wrt/shared/quantity";
import { SpeciesTiles } from "@/components/wrt/species/species-tiles";

export function YearView({ place, year, rows }: { place: Place; year: number; rows: RecordView[] }) {
  const recs = rows.filter((r) => r.record.year === year);
  const total = splitOf(recs.map((r) => r.record));
  const bySpecies = new Map<string, { species: Species; list: RecordView[] }>();
  for (const r of recs) {
    const e = bySpecies.get(r.species.id) ?? { species: r.species, list: [] };
    e.list.push(r);
    bySpecies.set(r.species.id, e);
  }
  const ranked = [...bySpecies.values()]
    .map((e) => ({ species: e.species, split: splitOf(e.list.map((r) => r.record)) }))
    .sort(byTotalDesc);
  const seasonTotals = [...new Set(recs.map((r) => r.season.name))].map((name) => ({ name, total: splitOf(recs.filter((r) => r.season.name === name).map((r) => r.record)) }));
  const q = (extra: Record<string, string | number | undefined> = {}) =>
    hrefs.records({ place: place.slug, year, ...extra });

  return (
    <Card
      id="year-view"
      title={`${formatNumber(ranked.length)} species recorded at ${place.name} in ${year}`}

      foot="Each tile opens that species’ records for this site and year, with the source cell."
    >
      <div className="flex flex-col gap-4">
        <QuantityFigure split={total} size="md" />
        <p className="m-0 flex flex-wrap gap-x-5 gap-y-1 [font:600_13px/1.4_var(--font-sans)] text-[var(--text-body)]">
          {seasonTotals.map((s) => <span key={s.name}><Link href={q({ season: s.name })} className="cn-link">{s.name || "Season not recorded"}</Link>: {formatNumber(s.total.total)}</span>)}
        </p>
        <SpeciesTiles records={recs} spread="seasons" hrefFor={(sp) => q({ species: sp.slug })} cap={12} />
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <CardLink href={q()}>All {formatNumber(total.records)} records for {year}</CardLink>

        </div>
      </div>
    </Card>
  );
}
