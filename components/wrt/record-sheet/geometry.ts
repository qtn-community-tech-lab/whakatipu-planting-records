/**
 * The record sheet's maths: bounds, centre and easing.
 * Plain functions with no map library or DOM. Coordinates are [longitude, latitude].
 */
export type LngLat = [number, number];

/** South-west and north-east corners of the box around the points. */
export function boundsOf(points: readonly LngLat[]): [LngLat, LngLat] {
  const lngs = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]];
}

export function centreOf(points: readonly LngLat[]): LngLat {
  const [sw, ne] = boundsOf(points);
  return [(sw[0] + ne[0]) / 2, (sw[1] + ne[1]) / 2];
}

/** A CSS cubic-bezier as a function, for map camera easing. */
export function bezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x) => {
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++) {
      t = (lo + hi) / 2;
      if (at(x1, x2, t) < x) lo = t; else hi = t;
    }
    return at(y1, y2, t);
  };
}
