import Link from "next/link";
import { formatNumber } from "@/lib/wrt/text";
import "./explore.css";

/** Previous / Next with "Showing 51–100 of 584". Plain links, no JS. */
export function RecordsPager({
  page, pageCount, from, to, total, hrefFor,
}: { page: number; pageCount: number; from: number; to: number; total: number; hrefFor: (page: number) => string }) {
  return (
    <nav className="wrt-pager" aria-label="Pages of records">
      <span className="wrt-muted" role="status">
        Showing {formatNumber(from)}–{formatNumber(to)} of {formatNumber(total)}
        {pageCount > 1 && <> · page {page} of {formatNumber(pageCount)}</>}
      </span>
      {pageCount > 1 && (
        <span className="flex gap-2">
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} rel="prev" className="cn-btn cn-btn--secondary cn-btn--md exp-pager__btn">← Previous</Link>
          ) : (
            <span className="cn-btn cn-btn--secondary cn-btn--md exp-pager__btn" aria-disabled="true">← Previous</span>
          )}
          {page < pageCount ? (
            <Link href={hrefFor(page + 1)} rel="next" className="cn-btn cn-btn--secondary cn-btn--md exp-pager__btn">Next →</Link>
          ) : (
            <span className="cn-btn cn-btn--secondary cn-btn--md exp-pager__btn" aria-disabled="true">Next →</span>
          )}
        </span>
      )}
    </nav>
  );
}
