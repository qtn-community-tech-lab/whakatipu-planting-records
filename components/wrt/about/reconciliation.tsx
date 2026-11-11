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
