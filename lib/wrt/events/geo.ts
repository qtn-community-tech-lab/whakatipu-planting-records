/**
 * Small polygon helpers for planting events. No dependencies, so they run the
 * same in the browser (live area while drawing) and on the server (validation).
 *
 * Coordinates are GeoJSON order: [longitude, latitude], WGS84.
 */
import type * as GeoJSON from "geojson";

type Ring = GeoJSON.Position[];
type Point = [number, number];

/** GeoJSON positions must contain at least longitude and latitude. */
function point(position: GeoJSON.Position | undefined): Point {
  const [longitude, latitude] = position ?? [];
  if (longitude === undefined || latitude === undefined) {
    throw new RangeError("A position needs longitude and latitude.");
  }
  return [longitude, latitude];
}

const EARTH_RADIUS_M = 6_378_137;
const rad = (d: number) => (d * Math.PI) / 180;

/** First and last positions are the same point (GeoJSON requires closed rings). */
export function isClosed(ring: Ring): boolean {
  if (ring.length < 2) return false;
  const [a, b] = [point(ring[0]), point(ring[ring.length - 1])];
  return a[0] === b[0] && a[1] === b[1];
}

/**
 * Area of one ring in square metres (spherical approximation, the same
 * formula turf.js uses; accurate to well under 1% at site scale).
 */
function ringArea(ring: Ring): number {
  let total = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = point(ring[i]);
    const [lon2, lat2] = point(ring[i + 1]);
    total += rad(lon2 - lon1) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)));
  }
  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

/** Polygon area in square metres: the outer ring minus any holes. */
export function polygonAreaM2(polygon: GeoJSON.Polygon): number {
  const [outer, ...holes] = polygon.coordinates;
  if (!outer) return 0;
  return Math.max(0, ringArea(outer) - holes.reduce((s, h) => s + ringArea(h), 0));
}

/** Do segments p1–p2 and p3–p4 cross (touching at an end counts as crossing)? */
function segmentsCross(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const orient = (a: Point, b: Point, c: Point) =>
    Math.sign((b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]));
  const onSegment = (a: Point, b: Point, c: Point) =>
    Math.min(a[0], c[0]) <= b[0] && b[0] <= Math.max(a[0], c[0]) &&
    Math.min(a[1], c[1]) <= b[1] && b[1] <= Math.max(a[1], c[1]);
  const o1 = orient(p1, p2, p3), o2 = orient(p1, p2, p4), o3 = orient(p3, p4, p1), o4 = orient(p3, p4, p2);
  if (o1 !== o2 && o3 !== o4) return true;
  return (o1 === 0 && onSegment(p1, p3, p2)) || (o2 === 0 && onSegment(p1, p4, p2)) ||
    (o3 === 0 && onSegment(p3, p1, p4)) || (o4 === 0 && onSegment(p3, p2, p4));
}

/**
 * True when a closed ring crosses itself (a "bow tie"). O(n²), fine for
 * hand-drawn shapes of a few dozen corners. Neighbouring edges share a corner
 * and are skipped, as is the first/last pair that closes the ring.
 */
export function ringSelfIntersects(ring: Ring): boolean {
  const n = ring.length - 1; // number of edges in a closed ring
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      if (segmentsCross(point(ring[i]), point(ring[i + 1]), point(ring[j]), point(ring[j + 1]))) return true;
    }
  }
  return false;
}
