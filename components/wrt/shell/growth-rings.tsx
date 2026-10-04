"use client";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatNumber } from "@/lib/wrt/text";

export interface RingSeason {
  slug: string;
  label: string;
  autumn: boolean;
  total: number;
  needsReview: number;
}

const SIZE = 200;
const C = SIZE / 2;
const OUTER = 94;
const PITH = 7;
const GAP = 1.2;
const MIN_W = 1.6;

/**
 * Every season as a tree ring: Autumn 2015 at the pith, the latest season at
 * the bark. Ring width grows with recorded plants (square-root scale so one
 * huge season cannot swallow the rest). Each ring keeps the split: the green
 * arc is resolved, the amber arc is plants on records WRT still has to rule on.
 */
export function GrowthRings({ seasons }: { seasons: RingSeason[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [hover, setHover] = useState<number | null>(null);

  const rings = useMemo(() => {
    const roots = seasons.map((s) => Math.sqrt(Math.max(s.total, 0)));
    const sumRoots = roots.reduce((a, b) => a + b, 0) || 1;
    const room = OUTER - PITH - GAP * seasons.length - MIN_W * seasons.length;
    const k = room / sumRoots;
    const widths = roots.map((root) => MIN_W + k * root);
    return seasons.map((s, i) => {
      const w = widths[i];
      const inner = PITH + GAP + widths.slice(0, i).reduce((a, b) => a + b + GAP, 0);
      const mid = inner + w / 2;
      const circ = 2 * Math.PI * mid;
      const share = s.total > 0 ? (s.total - s.needsReview) / s.total : 1;
      return { ...s, i, w, mid, circ, resolvedLen: circ * share };
    });
  }, [seasons]);

  const current = rings.find((r) => pathname === `/seasons/${r.slug}`)?.i ?? null;
  const focus = hover ?? current;
  const shown = focus !== null ? rings[focus] : null;
  const first = seasons[0]?.label;
  const last = seasons[seasons.length - 1]?.label;

  return (
    <figure className="wrt-rings" data-focus={hover !== null ? "hover" : current !== null ? "current" : undefined}>
      <figcaption className="wrt-rings__eyebrow">
        {seasons.length} seasons, one ring each
      </figcaption>
      <div className="wrt-rings__art" onMouseLeave={() => setHover(null)}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`${seasons.length} planting seasons drawn as tree rings, ${first} at the centre and ${last} on the outside.`}
        >
          <circle className="wrt-rings__pith" cx={C} cy={C} r={PITH - 1.5} />
          {rings.map((r) => (
            <g
              key={r.slug}
              className="wrt-rings__ring"
              data-autumn={r.autumn || undefined}
              data-empty={r.total === 0 || undefined}
              data-on={focus === r.i || undefined}
              style={{ "--i": r.i } as React.CSSProperties}
            >
              <circle className="wrt-rings__review" cx={C} cy={C} r={r.mid} strokeWidth={r.w} />
              <circle
                className="wrt-rings__resolved"
                cx={C}
                cy={C}
                r={r.mid}
                strokeWidth={r.w}
                strokeDasharray={`${r.resolvedLen} ${r.circ}`}
                transform={`rotate(-90 ${C} ${C})`}
              />
              <circle
                className="wrt-rings__hit"
                cx={C}
                cy={C}
                r={r.mid}
                strokeWidth={r.w + GAP}
                onMouseEnter={() => setHover(r.i)}
                onClick={() => router.push(`/seasons/${r.slug}`)}
              />
            </g>
          ))}
        </svg>
      </div>
      <div className="wrt-rings__read" aria-live="polite">
        {shown ? (
          <>
            <b>{shown.label}</b>
            <span>
              {shown.total === 0 ? "Nothing recorded" : `${formatNumber(shown.total)} recorded`}
              {shown.needsReview > 0 && (
                <>
                  {" · "}
                  <span className="wrt-rings__amber">{formatNumber(shown.needsReview)} need review</span>
                </>
              )}
            </span>
          </>
        ) : (
          <>
            <b>{first} → {last}</b>
            <span>The first season is in the centre. Hover a ring for its numbers.</span>
          </>
        )}
      </div>
    </figure>
  );
}
