import type { RecordView } from "@/lib/wrt/queries";
import { addToSplit, emptySplit } from "@/lib/wrt/queries";
import type { QuantitySplit, Season } from "@/lib/wrt/types";
import { formatNumber } from "@/lib/wrt/text";
import { QuantityCell } from "@/components/wrt/quantity";
import { SpeciesName } from "@/components/wrt/names";
import "./explore.css";

/** How many seasons the rows cover, in order. */
export function seasonsIn(rows: RecordView[]): Season[] {
  const m = new Map<string, Season>();
  for (const r of rows) m.set(r.season.slug, r.season);
  return [...m.values()].sort((a, b) => a.order - b.order);
}

/**
 * "By species": the direct answer to "What did we plant at Whitechapel in 2019?".
 * One row per species, one column per season in the result, then the total
 * with its needs-review part beside it.
 */
export function SpeciesSummary({ rows, seasons }: { rows: RecordView[]; seasons: Season[] }) {
  type Row = { species: RecordView["species"]; bySeason: Map<string, QuantitySplit>; total: QuantitySplit };
  const byId = new Map<string, Row>();
  const totals = new Map<string, QuantitySplit>(seasons.map((s) => [s.slug, emptySplit()]));
  const grand = emptySplit();
  for (const v of rows) {
    let row = byId.get(v.species.id);
    if (!row) byId.set(v.species.id, (row = { species: v.species, bySeason: new Map(), total: emptySplit() }));
    let cell = row.bySeason.get(v.season.slug);
    if (!cell) row.bySeason.set(v.season.slug, (cell = emptySplit()));
    addToSplit(cell, v.record);
    addToSplit(row.total, v.record);
    addToSplit(totals.get(v.season.slug)!, v.record);
    addToSplit(grand, v.record);
  }
  const list = [...byId.values()].sort(
    (a, b) => b.total.total - a.total.total || a.species.displayName.localeCompare(b.species.displayName),
  );
  const scroll = list.length > 14;
  const dash = <span className="cn-num--empty">–</span>;

  return (
    <div className={scroll ? "wrt-table-wrap exp-scroll" : "wrt-table-wrap"}>
      <table className="wrt-table exp-sum">
        <caption className="sr-only">Recorded plants by species and season</caption>
        <thead>
          <tr>
            <th>Species</th>
            {seasons.map((s) => <th key={s.slug} className="cn-num">{s.label}</th>)}
            <th className="cn-num">Total</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.species.id} className={r.total.needsReview ? "is-review" : undefined}>
              <td><SpeciesName species={r.species} link /></td>
              {seasons.map((s) => {
                const c = r.bySeason.get(s.slug);
                return <td key={s.slug} className="cn-num">{c ? formatNumber(c.total) : dash}</td>;
              })}
              <td className="cn-num"><QuantityCell split={r.total} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>All {formatNumber(list.length)} species</td>
            {seasons.map((s) => (
              <td key={s.slug} className="cn-num"><QuantityCell split={totals.get(s.slug)!} /></td>
            ))}
            <td className="cn-num"><QuantityCell split={grand} /></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
