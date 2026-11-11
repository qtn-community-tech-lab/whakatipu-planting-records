"use client";
/**
 * Plantings season by season, newest first, each its own row: an icon for the time of year, the season
 * and how long ago (and how many sites, when more than one), a bar for how big it was beside the others,
 * and its plants. Rows open the season when `onOpen` is given. Used for a site's past plantings.
 */
import { ChevronRight, Leaf, Snowflake, Sprout, Sun } from "lucide-react";
import { useId, type ReactNode } from "react";
import { seasonAgo } from "@/lib/wrt/events/season";
import { formatNumber } from "@/lib/wrt/text";
import { cn } from "@/lib/utils";

export interface PastSeason {
  slug: string; label: string; plants: number;
  /** How many of the site's parts (sites, to WRT) had plants that season; said when more than one. */
  parts?: number | undefined;
}

/** Each time of year's icon and tint. */
const KIND = {
  autumn: { Icon: Leaf, tint: "bg-[#f7ead8] text-[#8a5414]" },
  spring: { Icon: Sprout, tint: "bg-[#e6f0d8] text-[#3b6d11]" },
  summer: { Icon: Sun, tint: "bg-[#faf1c8] text-[#7a5c00]" },
  winter: { Icon: Snowflake, tint: "bg-[#e3edf6] text-[#22567f]" },
} as const;
/** "spring-2024" → spring. */
const kindOf = (slug: string) => KIND[slug.split("-")[0] as keyof typeof KIND] ?? KIND.autumn;

const row = "grid w-full grid-cols-[44px_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-2xl border border-[var(--border-card,#e6e8df)] bg-[var(--surface-card,#fff)] px-3 py-2.5 text-left font-sans text-[var(--cn-green-900)]";
const button = "cursor-pointer transition-colors hover:border-[var(--cn-green-600)] hover:bg-[#f6f9f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cn-green-800)]";

export function SeasonList({ seasons, today, onOpen, summary, children }: {
  seasons: readonly PastSeason[];
  /** NZ today, "YYYY-MM-DD": how long ago each season was. */
  today: string;
  onOpen?: ((season: PastSeason) => void) | undefined;
  /** Beside the heading, e.g. "6 seasons · 449 plants". */
  summary?: string | undefined;
  /** Under the list, e.g. a link to every season. */
  children?: ReactNode;
}) {
  const id = useId();
  const most = Math.max(1, ...seasons.map((x) => x.plants));
  return (
    <section className="flex flex-col gap-2.5" aria-labelledby={id}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={id} className="m-0 font-sans text-xs font-bold uppercase leading-none tracking-[0.06em] text-[var(--text-eyebrow)]">Past plantings</h3>
        {summary && <span className="font-sans text-[12.5px] font-medium tabular-nums text-[var(--text-muted)]">{summary}</span>}
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {seasons.map((x) => {
          const { Icon, tint } = kindOf(x.slug);
          const ago = [seasonAgo(x.slug, today), (x.parts ?? 1) > 1 && `${x.parts} sites`].filter(Boolean).join(" · ");
          const inner = (
            <>
              <span className={cn("grid size-11 place-items-center rounded-xl", tint)} aria-hidden="true"><Icon size={20} strokeWidth={2} /></span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <b className="text-[15px] font-bold leading-tight">{x.label}</b>
                {ago && <span className="text-[12.5px] font-medium leading-snug text-[var(--text-muted)]">{ago}</span>}
                {/* how big the season was, beside the biggest in the list */}
                <span className="mt-1.5 block h-1 overflow-hidden rounded-sm bg-[#eef2e8]" aria-hidden="true">
                  <span className="block h-full rounded-sm bg-[var(--cn-green-600)]" style={{ width: `${Math.max(4, (x.plants / most) * 100)}%` }} />
                </span>
              </span>
              <span className="flex flex-col items-end leading-tight">
                <b className="text-base font-extrabold tabular-nums">{formatNumber(x.plants)}</b>
                <span className="text-[11.5px] font-medium text-[var(--text-muted)]">{x.plants === 1 ? "plant" : "plants"}</span>
              </span>
              {onOpen && <ChevronRight className="text-[var(--cn-green-800)] opacity-70" size={18} strokeWidth={2.4} aria-hidden="true" />}
            </>
          );
          return (
            <li key={x.slug}>
              {onOpen
                ? <button type="button" className={cn(row, button)} onClick={() => onOpen(x)} aria-label={`${x.label}${ago ? `, ${ago}` : ""}, ${formatNumber(x.plants)} plants: see what was planted`}>{inner}</button>
                : <div className={row}>{inner}</div>}
            </li>
          );
        })}
      </ul>
      {children}
    </section>
  );
}
