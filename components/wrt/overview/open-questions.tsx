/**
 * Open questions for WRT. Same content and links as the shared ReviewThemeList,
 * but the plant count sits under the question on narrow screens.
 */
import Link from "next/link";
import type { ThemeSummary } from "@/lib/wrt/queries";
import { REVIEW_THEMES } from "@/lib/wrt/review-themes";
import { formatNumber } from "@/lib/wrt/text";
import { hrefs } from "@/components/wrt/names";
import { SplitBar } from "@/components/wrt/quantity";
import { Badge } from "@/components/ui/badge";

export function OpenQuestions({ themes }: { themes: ThemeSummary[] }) {
  if (!themes.length) return <p className="wrt-muted m-0">No records need a WRT ruling.</p>;
  const max = Math.max(...themes.map((t) => t.split.needsReview), 1);
  return (
    <div className="flex flex-col">
      {themes.map((t) => (
        <Link
          key={t.theme}
          href={hrefs.records({ review: "needs-review", theme: t.theme })}
          className="cn-row !text-[var(--text-strong)] hover:bg-[var(--surface-soft)] first:border-t-0 max-sm:!grid-cols-1 max-sm:!gap-2.5"
        >
          <span className="flex flex-col gap-1.5 min-w-0">
            <span className="cn-row__title">{REVIEW_THEMES[t.theme].label}</span>
            <span className="cn-row__line">{REVIEW_THEMES[t.theme].question}</span>
            <SplitBar split={{ ...t.split, resolved: 0, total: t.split.needsReview }} max={max} size="sm" className="max-w-[280px]" />
          </span>
          <Badge tone="review" size="lg" className="max-sm:justify-self-start">
            {formatNumber(t.split.needsReview)} plants · {formatNumber(t.split.recordsNeedingReview)} record
            {t.split.recordsNeedingReview === 1 ? "" : "s"}
          </Badge>
        </Link>
      ))}
    </div>
  );
}
