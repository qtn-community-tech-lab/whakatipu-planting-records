/**
 * DataTable: the app's shared table. A real <table className="wrt-table">
 * inside .wrt-table-wrap, so columns stay aligned on every screen and
 * narrow screens scroll the table sideways instead of reflowing its rows.
 *
 *   <DataTable
 *     caption="Planting events, newest first"
 *     rows={views}
 *     rowKey={(v) => v.event.id}
 *     minWidth={720}
 *     columns={[
 *       { key: "date", header: "Date", cell: (v) => v.dateLabel, nowrap: true },
 *       { key: "plants", header: "Plants", cell: (v) => formatNumber(v.totalPlants), numeric: true, strong: true },
 *     ]}
 *   />
 *
 * Why a component: the CSS was shared but every page wrote its own table
 * markup, and the one page that didn't (events, built from <div>s) broke on
 * mobile. Pages can move onto this one at a time. Demo: /playground/table.
 *
 * Works in Server Components (no client JS): cell functions run where the
 * table renders.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  /** Stable React key for the column. */
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Right-aligned, tabular figures, never wraps (counts, areas, money). */
  numeric?: boolean;
  /** Keep the cell on one line (dates, short labels). */
  nowrap?: boolean;
  /** Bold the cell (the headline figure of a row). */
  strong?: boolean;
  /** Visually hide the header but keep it for screen readers (e.g. an "Actions" column). */
  hideHeader?: boolean;
  /** Extra classes on this column's <td>s. */
  className?: string;
}

export function DataTable<T>({
  caption, rows, columns, rowKey, minWidth = 640, rowClassName, empty, className,
}: {
  /** Describes the table for screen readers (not shown). Required: every table needs a name. */
  caption: string;
  rows: readonly T[];
  columns: readonly DataTableColumn<T>[];
  rowKey: (row: T) => string;
  /**
   * Width in px below which the table scrolls sideways rather than squeezing
   * its columns. Pick roughly the width at which the content still reads well.
   */
  minWidth?: number;
  rowClassName?: (row: T) => string | undefined;
  /** Shown in place of the table when there are no rows. */
  empty?: ReactNode;
  className?: string;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;
  return (
    <div className={cn("wrt-table-wrap", className)}>
      <table className="wrt-table wrt-data-table" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={c.numeric ? "cn-num" : undefined}>
                {c.hideHeader ? <span className="sr-only">{c.header}</span> : c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className={rowClassName?.(row)}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(c.numeric && "cn-num", c.nowrap && "whitespace-nowrap", c.strong && "font-extrabold", c.className) || undefined}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
