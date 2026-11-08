/**
 * A titled list of rows, each a name and a figure: a site's top species, its seasons, every site
 * and its plants. A row can have a round photo (or the name's first letter) and a smaller line
 * under the name, and can be a button.
 */
import Image from "next/image";
import type { ReactNode } from "react";
import s from "./figure-list.module.css";

export interface FigureRow {
  key: string;
  name: string;
  /** Scientific names are italic. */
  italic?: boolean;
  /** A smaller line under the name. */
  sub?: string;
  /** The number on the right, formatted. */
  figure: string;
  /** A round photo before the name; null shows the name's first letter. Leave out for neither. */
  photo?: { src: string; focalPoint: string } | null;
  /** Makes the row a button. */
  onClick?: () => void;
}

export function FigureList({ title, rows, children }: {
  title: string;
  rows: readonly FigureRow[];
  /** Under the list, e.g. a link to more. */
  children?: ReactNode;
}) {
  return (
    <section className={s.list} aria-label={title}>
      <h3 className={s.title}>{title}</h3>
      <ul>
        {rows.map((r) => {
          const inner = (
            <>
              {r.photo !== undefined && (
                <span className={s.photo} aria-hidden="true">
                  {r.photo
                    ? <Image src={r.photo.src} alt="" fill sizes="32px" unoptimized style={{ objectFit: "cover", objectPosition: r.photo.focalPoint }} />
                    : r.name.charAt(0)}
                </span>
              )}
              <span className={s.name}>
                {r.italic ? <i>{r.name}</i> : r.name}
                {r.sub && <small>{r.sub}</small>}
              </span>
              <b>{r.figure}</b>
            </>
          );
          return <li key={r.key}>{r.onClick ? <button type="button" onClick={r.onClick}>{inner}</button> : inner}</li>;
        })}
      </ul>
      {children}
    </section>
  );
}
