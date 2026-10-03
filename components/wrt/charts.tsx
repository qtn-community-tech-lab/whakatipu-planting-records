/**
 * Charts, drawn with Canopy bars only (no chart library).
 * Every chart keeps the resolved / needs-review split visible.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import type { QuantitySplit } from "@/lib/wrt/types";
import type { SeasonPoint, YearRow } from "@/lib/wrt/queries";
import { formatNumber } from "@/lib/wrt/text";
import { SplitBar } from "./quantity";
import { hrefs } from "./names";
import { cn } from "@/lib/utils";

function seasonTitle(p: SeasonPoint) {
  const s = p.split;
  if (!s.records) return `${p.season.label}: no records`;
  return `${p.season.label}: ${formatNumber(s.total)} recorded plants` +
    (s.needsReview ? ` (${formatNumber(s.needsReview)} needing review)` : "");
}

/**
 * One column per season, stacked resolved + needs review. Autumn and spring
 * alternate in two greens so the two seasons in a year read apart.
 * Columns link to the season page unless `link` is false.
 */
export function SeasonColumns({
  points, currentSlug, size = "md", link = true, hrefFor, caption,
}: {
  points: SeasonPoint[];
  currentSlug?: string;
  size?: "md" | "sm";
  link?: boolean;
  hrefFor?: (p: SeasonPoint) => string;
  caption?: string;
}) {
  const max = Math.max(1, ...points.map((p) => p.split.total));
  return (
    <figure className="m-0">
      <div className={cn("wrt-cols", size === "sm" && "wrt-cols--sm")} role="list" aria-label={caption ?? "Recorded plants by season"}>
        {points.map((p) => {
          const r = (p.split.resolved / max) * 100;
          const n = (p.split.needsReview / max) * 100;
          const body = (
            <div className="wrt-col__stack" style={{ height: p.split.total ? `${Math.max(1.5, r + n)}%` : undefined }}>
              {r > 0 && (
                <span
                  className={cn("wrt-col__seg", p.season.name === "Spring" && "wrt-col__seg--spring")}
                  style={{ flex: `${p.split.resolved} 0 0` }}
                />
              )}
              {n > 0 && <span className="wrt-col__seg wrt-col__seg--review" style={{ flex: `${p.split.needsReview} 0 0` }} />}
            </div>
          );
          const cls = cn("wrt-col", !p.split.records && "wrt-col--empty");
          const common = {
            className: cls,
            title: seasonTitle(p),
            "aria-label": seasonTitle(p),
            "aria-current": p.season.slug === currentSlug ? ("true" as const) : undefined,
            role: "listitem",
          };
          return link && p.split.records ? (
            <Link key={p.season.slug} href={hrefFor ? hrefFor(p) : hrefs.season(p.season.slug)} {...common}>
              {body}
            </Link>
          ) : (
            <div key={p.season.slug} {...common}>
              {body}
            </div>
          );
        })}
      </div>
      <div className="wrt-cols__axis" aria-hidden="true">
        {points.map((p) => (
          <span key={p.season.slug}>{p.season.name === "Autumn" || p.season.order === 0 ? `’${String(p.season.year).slice(2)}` : ""}</span>
        ))}
      </div>
      {caption && <figcaption className="wrt-rule mt-2.5">{caption}</figcaption>}
    </figure>
  );
}

export interface RankedItem {
  key: string;
  label: ReactNode;
  split: QuantitySplit;
  href?: string;
}

/** Ranked horizontal bars (sites, species). Bars are relative to the largest item. */
export function RankedBars({ items, max }: { items: RankedItem[]; max?: number }) {
  const m = max ?? Math.max(1, ...items.map((i) => i.split.total));
  return (
    <div className="wrt-ranked">
      {items.map((it) => {
        const inner = (
          <>
            <span className="min-w-0">{it.label}</span>
            <SplitBar split={it.split} max={m} size="sm" />
            <span className="wrt-ranked__value">
              {formatNumber(it.split.total)}
              {it.split.needsReview > 0 && (
                <span className="wrt-ranked__sub">{formatNumber(it.split.needsReview)} need review</span>
              )}
            </span>
          </>
        );
        return it.href ? (
          <Link key={it.key} href={it.href} className="wrt-ranked__row">
            {inner}
          </Link>
        ) : (
          <div key={it.key} className="wrt-ranked__row">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

/** Year table: Autumn | Spring | Year | Running total. Needs-review shown under each figure. */
export function YearTable({ years, seasonHref }: { years: YearRow[]; seasonHref?: (year: number, season: "autumn" | "spring") => string }) {
  const cell = (s: QuantitySplit, href?: string) =>
    s.records === 0 ? (
      <span className="cn-num--empty">–</span>
    ) : (
      <span className="inline-flex flex-col items-end gap-1">
        {href ? <Link href={href}>{formatNumber(s.total)}</Link> : <span>{formatNumber(s.total)}</span>}
        {s.needsReview > 0 && (
          <span className="[font:600_11px/1_var(--font-sans)] text-[var(--cn-behind-fg)]">{formatNumber(s.needsReview)} review</span>
        )}
      </span>
    );
  return (
    <div className="wrt-table-wrap">
      <table className="wrt-table">
        <thead>
          <tr>
            <th>Year</th>
            <th className="cn-num">Autumn</th>
            <th className="cn-num">Spring</th>
            <th className="cn-num">Year</th>
            <th className="cn-num">Running total</th>
          </tr>
        </thead>
        <tbody>
          {years.map((y) => (
            <tr key={y.year}>
              <td>{y.year}</td>
              <td className="cn-num">{cell(y.autumn, y.autumn.records && seasonHref ? seasonHref(y.year, "autumn") : undefined)}</td>
              <td className="cn-num">{cell(y.spring, y.spring.records && seasonHref ? seasonHref(y.year, "spring") : undefined)}</td>
              <td className="cn-num font-extrabold">{cell(y.total)}</td>
              <td className="cn-num text-[var(--text-body)]">{formatNumber(y.runningTotal.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
