/**
 * Reconciliation tables for the "About the data" page: the records' totals set
 * against the totals WRT's own workbook states. Plain tables, Canopy styling.
 */
import type { ReconciliationRow } from "@/lib/wrt/types";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/wrt/text";

/** True minus for negative differences, plus sign for positive, nothing for zero. */
function formatDifference(n: number): string {
  if (n === 0) return "0";
  return n > 0 ? `+${formatNumber(n)}` : `−${formatNumber(Math.abs(n))}`;
}

/** Friendly names for the known grand-total cells. Unknown rows fall back to the label as stored. */
const GRAND_NAMES: { match: RegExp; name: string }[] = [
  { match: /^MASTER!PY107$/, name: "Grand total cell, MASTER sheet" },
  { match: /^MASTER!PY8:PY106$/, name: "Species row totals added up, MASTER sheet" },
  { match: /^MASTER!PZ107$/, name: "Unlabelled cell beside the grand total, MASTER sheet" },
];

function grandName(row: ReconciliationRow): string {
  const known = GRAND_NAMES.find((g) => g.match.test(row.statedCell));
  if (known) return known.name;
  if (/SUMMARY SITES/i.test(row.label)) return "All-time total by site, SUMMARY SITES sheet";
  if (/SUMMARY PLANTS/i.test(row.label)) return "All-time total by species, SUMMARY PLANTS sheet";
  return row.label;
}

/** One row per season: records add to, workbook total, cell. */
export function SeasonReconciliationTable({ rows }: { rows: ReconciliationRow[] }) {
  return (
    <div className="wrt-table-wrap">
      <table className="wrt-table [&_td]:px-1.5 [&_th]:px-1.5 sm:[&_td]:px-2.5 sm:[&_th]:px-2.5">
        <caption className="sr-only">Each season’s total from the records against the total cell in the workbook</caption>
        <thead>
          <tr>
            <th>Season</th>
            <th className="cn-num">Records add to</th>
            <th className="cn-num">Workbook total</th>
            <th className="hidden sm:table-cell">Workbook cell</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="whitespace-nowrap font-semibold">{r.label}</td>
              <td className="cn-num">{formatNumber(r.generated)}</td>
              <td className="cn-num">{formatNumber(r.stated)}</td>
              <td className="hidden whitespace-nowrap sm:table-cell"><code className="[font:var(--type-code)] text-[var(--text-body)]">{r.statedCell}</code></td>
              <td className="whitespace-nowrap">
                {r.difference === 0 ? (
                  <Badge tone="ok">Matches</Badge>
                ) : (
                  <Badge tone="review">{formatDifference(r.difference)} apart</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The all-time totals: why the workbook shows different figures to the records.
 * A list rather than a wide table so the explanation stays readable at 390px.
 */
export function GrandReconciliationTable({ rows, recordsTotal }: { rows: ReconciliationRow[]; recordsTotal: number }) {
  return (
    <div role="table" aria-label={`All-time totals stated in the workbook against the ${formatNumber(recordsTotal)} the records add to`}>
      <div role="row" className="flex justify-between gap-4 px-0.5 pb-2 text-[12px] font-semibold text-[var(--text-muted)]">
        <span role="columnheader">Total in the workbook</span>
        <span role="columnheader">Workbook shows</span>
      </div>
      {rows.map((r) => (
        <GrandRow key={r.label} row={r} />
      ))}
    </div>
  );
}

function GrandRow({ row }: { row: ReconciliationRow }) {
  const agrees = row.difference === 0;
  return (
    <div role="row" className="flex flex-col gap-2 border-t border-[var(--border-row)] px-0.5 py-3.5">
      <div className="flex items-start justify-between gap-4">
        <span role="cell" className="cn-species min-w-0">
          <span className="cn-species__common">{grandName(row)}</span>
          <span className="cn-species__latin !not-italic break-words">{row.statedCell}</span>
        </span>
        <span role="cell" className="flex flex-none flex-col items-end gap-1.5">
          <span className="text-[17px] font-extrabold tabular-nums text-[var(--text-strong)]">{formatNumber(row.stated)}</span>
          {agrees ? <Badge tone="ok">Agrees with the records</Badge> : <Badge tone="review">Records {row.difference > 0 ? "higher" : "lower"} by {formatNumber(Math.abs(row.difference))}</Badge>}
        </span>
      </div>
      {row.cause && <p className="wrt-rule m-0 max-w-[72ch] break-words">{row.cause}</p>}
    </div>
  );
}
