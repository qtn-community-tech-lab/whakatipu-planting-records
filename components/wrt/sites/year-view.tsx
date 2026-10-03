/**
 * "What went in during <year>" for one site: the species recorded that year,
 * with the resolved / needs-review split kept on every row.
 */
import Link from "next/link";
import type { RecordView } from "@/lib/wrt/queries";
import { splitOf } from "@/lib/wrt/queries";
import type { Place, QuantitySplit, Species } from "@/lib/wrt/types";
import { formatNumber } from "@/lib/wrt/text";
import { Card, CardLink } from "@/components/wrt/page";
import { SpeciesName, hrefs } from "@/components/wrt/names";
import { QuantityFigure, SplitKey } from "@/components/wrt/quantity";
import { RankedBars } from "@/components/wrt/charts";

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
    .sort((a, b) => b.split.total - a.split.total);
  const season = (name: "Autumn" | "Spring"): QuantitySplit =>
    splitOf(recs.filter((r) => r.record.seasonName === name).map((r) => r.record));
  const autumn = season("Autumn");
  const spring = season("Spring");
  const q = (extra: Record<string, string | number | undefined> = {}) =>
    hrefs.records({ place: place.slug, year, ...extra });

  return (
    <Card
      id="year-view"
      title={`${formatNumber(ranked.length)} species recorded at ${place.name} in ${year}`}
      action={<SplitKey />}
      foot="Each row opens that species’ records for this site and year, with the source cell."
    >
      <div className="flex flex-col gap-4">
        <QuantityFigure split={total} size="md" />
        <p className="m-0 flex flex-wrap gap-x-5 gap-y-1 [font:600_13px/1.4_var(--font-sans)] text-[var(--text-body)]">
          {autumn.records > 0 && (
            <span>
              <Link href={q({ season: "Autumn" })} className="cn-link">Autumn {year}</Link>: {formatNumber(autumn.total)}
              {autumn.needsReview > 0 && <span className="wrt-review text-[var(--cn-behind-fg)]"> ({formatNumber(autumn.needsReview)} need review)</span>}
            </span>
          )}
          {spring.records > 0 && (
            <span>
              <Link href={q({ season: "Spring" })} className="cn-link">Spring {year}</Link>: {formatNumber(spring.total)}
              {spring.needsReview > 0 && <span className="text-[var(--cn-behind-fg)]"> ({formatNumber(spring.needsReview)} need review)</span>}
            </span>
          )}
        </p>
        <RankedBars
          items={ranked.map((r) => ({
            key: r.species.id,
            label: <SpeciesName species={r.species} />,
            split: r.split,
            href: q({ species: r.species.slug }),
          }))}
        />
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <CardLink href={q()}>All {formatNumber(total.records)} records for {year}</CardLink>
          {total.recordsNeedingReview > 0 && (
            <CardLink href={q({ review: "needs-review" })}>
              {formatNumber(total.recordsNeedingReview)} record{total.recordsNeedingReview === 1 ? "" : "s"} needing review
            </CardLink>
          )}
        </div>
      </div>
    </Card>
  );
}
