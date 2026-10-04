/**
 * Faint topographic contours behind the sidebar, a nod to the hills around
 * Whakatipu. Deterministic so server and client render the same paths.
 */
function contour(cx: number, cy: number, r: number, k: number): string {
  const steps = 72;
  const pts: string[] = [];
  for (let s = 0; s <= steps; s++) {
    const t = (s / steps) * Math.PI * 2;
    const wobble = 1 + 0.09 * Math.sin(3 * t + k * 0.7) + 0.05 * Math.sin(5 * t - k * 1.3) + 0.03 * Math.cos(7 * t + k);
    const x = cx + r * 1.25 * wobble * Math.cos(t);
    const y = cy + r * 0.85 * wobble * Math.sin(t);
    pts.push(`${s === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join("") + "Z";
}

const PEAKS = [
  { cx: 210, cy: 760, rings: 9, step: 22 },
  { cx: 20, cy: 120, rings: 6, step: 20 },
];

export function Contours() {
  return (
    <svg className="wrt-side__contours" viewBox="0 0 248 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      {PEAKS.flatMap((p, pi) =>
        Array.from({ length: p.rings }, (_, i) => (
          <path key={`${pi}-${i}`} d={contour(p.cx, p.cy, 14 + i * p.step, i + pi * 3)} />
        )),
      )}
    </svg>
  );
}
