/**
 * A drawn planted area as a small picture: its outline on a dark tile, as it sits on the map, or with
 * `onMap`, on the satellite imagery of where it is. How an area is told apart from the others at a glance.
 *
 * The satellite picture is a few plain map tiles (Web Mercator, as the big map uses), not a live map:
 * a list of areas would otherwise start a map engine per row.
 */
import { SATELLITE_TILES } from "./satellite";

type Ring = readonly (readonly [number, number])[];

const TILE = 256;
/** Zoom range for the imagery, and how much of the picture the area fills. */
const MIN_ZOOM = 12, MAX_ZOOM = 19, FILL = 0.7;

/** [longitude, latitude] to Web Mercator pixels at zoom `z`. */
function mercator([lng, lat]: readonly [number, number], z: number) {
  const n = TILE * 2 ** z;
  const sin = Math.sin((lat * Math.PI) / 180);
  return { x: ((lng + 180) / 360) * n, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * n };
}

export function AreaShape({ pts, size = 44, onMap = false }: { pts: Ring; size?: number; onMap?: boolean }) {
  const radius = Math.round(size * 0.27);
  if (onMap) return <OnMap pts={pts} size={size} radius={radius} />;
  const pad = Math.round(size * 0.12);
  const k = Math.cos(((pts[0]?.[1] ?? 0) * Math.PI) / 180);
  const xs = pts.map((p) => p[0] * k), ys = pts.map((p) => -p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  const w = Math.max(...xs) - x0, h = Math.max(...ys) - y0;
  const scale = (size - pad * 2) / (Math.max(w, h) || 1);
  const dx = (size - w * scale) / 2, dy = (size - h * scale) / 2;
  const d = xs.map((x, i) => `${i ? "L" : "M"}${(dx + (x - x0) * scale).toFixed(1)} ${(dy + (ys[i]! - y0) * scale).toFixed(1)}`).join("") + "Z";
  return (
    <span
      className="block shrink-0 bg-[var(--cn-green-900)] shadow-[inset_0_0_0_1px_rgba(214,234,140,0.25)]"
      style={{ width: size, height: size, borderRadius: radius }} aria-hidden="true"
    >
      <svg className="block" viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <path d={d} fill="rgba(214, 234, 140, 0.3)" stroke="var(--cn-lime-300)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </span>
  );
}

/**
 * The area on its satellite imagery. The zoom is the closest where the area fills about FILL of the picture;
 * tiles one zoom closer are drawn at half size, so it's sharp on high-density screens.
 */
function OnMap({ pts, size, radius }: { pts: Ring; size: number; radius: number }) {
  const at0 = pts.map((p) => mercator(p, 0));
  const span0 = Math.max(Math.max(...at0.map((p) => p.x)) - Math.min(...at0.map((p) => p.x)), Math.max(...at0.map((p) => p.y)) - Math.min(...at0.map((p) => p.y)));
  const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM - 1, Math.floor(Math.log2((size * FILL) / (span0 || 1e-9)))));
  const tz = z + 1, half = 0.5; // the tiles' zoom, and their scale on screen
  const at = pts.map((p) => mercator(p, tz));
  const xs = at.map((p) => p.x), ys = at.map((p) => p.y);
  // The picture's top-left, in the tiles' pixels: the area's middle in the middle.
  const left = (Math.min(...xs) + Math.max(...xs)) / 2 - size / half / 2;
  const top = (Math.min(...ys) + Math.max(...ys)) / 2 - size / half / 2;
  const tiles: { x: number; y: number }[] = [];
  for (let x = Math.floor(left / TILE); x <= Math.floor((left + size / half) / TILE); x++)
    for (let y = Math.floor(top / TILE); y <= Math.floor((top + size / half) / TILE); y++) tiles.push({ x, y });
  const d = at.map((p, i) => `${i ? "L" : "M"}${((p.x - left) * half).toFixed(1)} ${((p.y - top) * half).toFixed(1)}`).join("") + "Z";
  return (
    <span
      className="relative block shrink-0 overflow-hidden bg-[#1b2a1f] shadow-[inset_0_0_0_1px_rgba(21,38,28,0.25)]"
      style={{ width: size, height: size, borderRadius: radius }} aria-hidden="true"
    >
      {tiles.map((t) => (
        <span
          key={`${t.x}/${t.y}`} className="absolute bg-cover"
          style={{
            left: (t.x * TILE - left) * half, top: (t.y * TILE - top) * half, width: TILE * half, height: TILE * half,
            backgroundImage: `url(${SATELLITE_TILES.replace("{z}", String(tz)).replace("{x}", String(t.x)).replace("{y}", String(t.y))})`,
          }}
        />
      ))}
      {/* A dark halo under the outline, so it reads on any ground. */}
      <svg className="absolute inset-0" viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <path
          d={d} fill="rgba(214, 234, 140, 0.28)" stroke="var(--cn-lime-300)" strokeWidth={2.2} strokeLinejoin="round" paintOrder="stroke"
          style={{ filter: "drop-shadow(0 0 1.5px rgba(8, 16, 11, 0.9))" }}
        />
      </svg>
    </span>
  );
}
