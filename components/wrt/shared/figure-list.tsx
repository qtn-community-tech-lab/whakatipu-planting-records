/**
 * A titled list of rows, each a name and a figure: a site's top species, its seasons, every site
 * and its plants. Each row is a ListRow: a round photo (or the name's first letter), a smaller
 * line under the name, and it can be a button. A `head` can stand in for the title heading, and
 * `total` adds a bold row under the rows.
 */
import type { ReactNode } from "react";
import { ListRow } from "./list-row";

export interface FigureRow {
  key: string;
  name: string;
  /** Scientific names are italic. */
  italic?: boolean | undefined;
  /** A smaller line under the name. */
  sub?: string | undefined;
  /** The number on the right, formatted. */
  figure: string;
  /** A round photo before the name; null shows the name's first letter. Leave out for neither. */
  photo?: { src: string } | null;
  /** Instead of a photo: any element before the name, e.g. an area's outline. */
  lead?: ReactNode | undefined;
  /** Makes the row a button. */
  onClick?: (() => void) | undefined;
}

export function FigureList({ title, head, rows, total, children }: {
  /** The heading, or with `head`, only the list's label for screen readers. */
  title: string;
  /** Shown instead of the title heading, e.g. a row naming what the list is of. */
  head?: ReactNode | undefined;
  rows: readonly FigureRow[];
  /** A bold row under the rows, with a line above it: "Total", "1,240 plants". */
  total?: { label: string; figure: string };
  /** Under the list, e.g. a link to more. */
  children?: ReactNode | undefined;
}) {
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      {head ?? <h3 className="m-0 font-sans text-xs font-bold uppercase leading-none tracking-[0.06em] text-[var(--text-eyebrow)]">{title}</h3>}
      <ul className="m-0 list-none p-0">
        {rows.map((r) => (
          <li key={r.key} className="border-b border-[var(--border-card,#e6e8df)] last:border-b-0">
            <ListRow
              title={r.italic ? <i>{r.name}</i> : r.name} initial={r.name.charAt(0)} subtitle={r.sub}
              photo={r.photo} lead={r.lead} figure={r.figure} onClick={r.onClick}
              className={r.onClick ? "hover:[&_[data-slot=title]]:underline hover:[&_[data-slot=title]]:underline-offset-[3px]" : undefined}
            />
          </li>
        ))}
      </ul>
      {total && <ListRow title={total.label} figure={total.figure} className="border-t-2 border-[var(--text-strong)] [&_[data-slot=title]]:font-extrabold [&_[data-slot=figure]]:font-extrabold" />}
      {children}
    </section>
  );
}
