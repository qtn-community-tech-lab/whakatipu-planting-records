import Link from "next/link";
import { SORT_KEYS, SORT_LABELS, type RecordsView, recordsHref } from "./filters";
import "./explore.css";

/** "Sort by" as a row of links. The current sort is aria-current. */
export function SortLinks({ view }: { view: RecordsView }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="cn-field__label" id="exp-sort">Sort by</span>
      <nav className="cn-seg exp-seg" aria-labelledby="exp-sort">
        {SORT_KEYS.map((k) => (
          <Link
            key={k}
            href={recordsHref(view, { sort: k === "season" ? undefined : k })}
            className="cn-seg__opt"
            aria-current={view.sort === k ? "true" : undefined}
            replace
          >
            {SORT_LABELS[k]}
          </Link>
        ))}
      </nav>
    </div>
  );
}
