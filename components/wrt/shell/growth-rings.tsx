"use client";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { hrefs } from "@/components/wrt/shared/names";
import { formatNumber } from "@/lib/wrt/text";

export interface RingSeason {
  slug: string;
  label: string;
  total: number;
}

const SIZE = 200;
const C = SIZE / 2;
const OUTER = 94;
const PITH = 7;
const GAP = 1.2;
const MIN_W = 1.6;

/** One ring per saved season label, ordered alphabetically. */
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
      const share = 1;
      return { ...s, i, w, mid, circ, resolvedLen: circ * share };
    });
  }, [seasons]);

  const current = rings.find((r) => pathname === hrefs.season(r.slug))?.i ?? null;
  const focus = hover ?? current;
  const shown = focus !== null ? rings[focus] : null;
  if (!seasons.length) return null;
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
              data-empty={r.total === 0 || undefined}
              data-on={focus === r.i || undefined}
              style={{ "--i": r.i } as React.CSSProperties}
            >
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
                onClick={() => router.push(hrefs.season(r.slug))}
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

            </span>
          </>
        ) : (
          <>
            <b>{first} → {last}</b>
            <span>Seasons are ordered alphabetically. Hover a ring for its numbers.</span>
          </>
        )}
      </div>
    </figure>
  );
}
