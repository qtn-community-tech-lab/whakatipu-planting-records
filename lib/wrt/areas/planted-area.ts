/**
 * The maths for a drawn planted area: its size in hectares, and turning a
 * traced line into a few corners. No map code here.
 */

/** [longitude, latitude] */
export type LngLat = [number, number];
/** A point on screen, in px. */
export interface Px { x: number; y: number }

const EARTH_RADIUS_M = 6378137;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** The area inside a ring of corners (not repeated at the end), in hectares, on the sphere. */
export function hectares(ring: readonly LngLat[]): number {
  const n = ring.length;
  if (n < 3) return 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const before = ring[i], here = ring[(i + 1) % n], after = ring[(i + 2) % n];
    total += (rad(after[0]) - rad(before[0])) * Math.sin(rad(here[1]));
  }
  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2) / 10_000;
}

/** "0.42 ha", "3.1 ha", "120 ha". */
export function formatHectares(ha: number): string {
  if (ha < 10) return `${ha.toFixed(2)} ha`;
  if (ha < 100) return `${ha.toFixed(1)} ha`;
  return `${Math.round(ha)} ha`;
}

const dist = (a: Px, b: Px) => Math.hypot(a.x - b.x, a.y - b.y);

/** How far `p` is from the segment a–b. */
function segmentDistance(p: Px, a: Px, b: Px): number {
  const dx = b.x - a.x, dy = b.y - a.y, len = dx * dx + dy * dy;
  if (!len) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Ramer–Douglas–Peucker: the indexes of the points to keep, ends included. */
function keep(points: readonly Px[], from: number, to: number, tolerance: number, out: Set<number>) {
  let far = 0, at = -1;
  for (let i = from + 1; i < to; i++) {
    const d = segmentDistance(points[i], points[from], points[to]);
    if (d > far) { far = d; at = i; }
  }
  out.add(from).add(to);
  if (far > tolerance && at > 0) {
    keep(points, from, at, tolerance, out);
    keep(points, at, to, tolerance, out);
  }
}

/**
 * A traced loop as a few corners: the indexes of the trace's points to keep, in order.
 * The loop is split at the point furthest from where it started, so both halves simplify well.
 * `tolerance` is in px: how far a kept line may stray from the finger's path.
 */
export function simplifyTrace(points: readonly Px[], tolerance = 10): number[] {
  if (points.length < 3) return points.map((_, i) => i);
  let far = 0, split = 0;
  points.forEach((p, i) => { const d = dist(p, points[0]); if (d > far) { far = d; split = i; } });
  // Close the loop by repeating the start, simplify both halves, then drop the repeat.
  const loop = [...points, points[0]];
  const kept = new Set<number>();
  keep(loop, 0, split, tolerance, kept);
  keep(loop, split, loop.length - 1, tolerance, kept);
  kept.delete(loop.length - 1);
  return [...kept].sort((a, b) => a - b);
}
