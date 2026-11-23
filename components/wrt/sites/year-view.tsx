/**
 * "What went in during <year>" for one site: the species recorded that year,
 * with recorded totals on every row.
 */
import Link from "next/link";
import type { HistoryCell } from "@/lib/wrt/presentation";
import { sumSplits, tileRows } from "@/lib/wrt/presentation";
import type { Place, QuantitySplit, SeasonName } from "@/lib/wrt/types";
import { formatNumber } from "@/lib/wrt/text";
import { Card, CardLink } from "@/components/wrt/shared/page";
import { hrefs } from "@/components/wrt/shared/names";
import { QuantityFigure, SplitKey } from "@/components/wrt/shared/quantity";
import { SpeciesTiles } from "@/components/wrt/species/species-tiles";

export function YearView({ place, year, cells }: { place: Place; year: number; cells: HistoryCell[] }) {
  const recs = cells.filter((cell) => cell.season?.year === year);
  const total = sumSplits(recs);
  const ranked = tileRows(recs, "seasons");
  const season = (name: SeasonName): QuantitySplit =>
    sumSplits(recs.filter((cell) => cell.season?.name === name));
  const autumn = season("Autumn");
  const spring = season("Spring");
  const q = (extra: Record<string, string | number | undefined> = {}) =>
    hrefs.records({ place: place.slug, year, ...extra });

  return (
    <Card
      id="year-view"
      title={`${formatNumber(ranked.length)} species recorded at ${place.name} in ${year}`}
      action={<SplitKey />}
      foot="Each tile opens that species’ records for this site and year, with the source cell."
    >
      <div className="flex flex-col gap-4">
        <QuantityFigure split={total} size="md" />
        <p className="m-0 flex flex-wrap gap-x-5 gap-y-1 [font:600_13px/1.4_var(--font-sans)] text-[var(--text-body)]">
          {autumn.records > 0 && (
            <span>
              <Link href={q({ season: "Autumn" })} className="cn-link">Autumn {year}</Link>: {formatNumber(autumn.total)}
            </span>
          )}
          {spring.records > 0 && (
            <span>
              <Link href={q({ season: "Spring" })} className="cn-link">Spring {year}</Link>: {formatNumber(spring.total)}
            </span>
          )}
        </p>
        <SpeciesTiles rows={ranked} spread="seasons" hrefFor={(sp) => q({ species: sp.slug })} cap={12} />
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <CardLink href={q()}>All {formatNumber(total.records)} records for {year}</CardLink>
        </div>
      </div>
    </Card>
  );
}
