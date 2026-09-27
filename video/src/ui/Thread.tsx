import { C } from "../theme";

export type Pt = [number, number];

/** Courbe lissée (Catmull-Rom) passant par les points donnés, échantillonnée finement. */
export function spline(points: Pt[], samplesPerSegment = 40): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let j = 0; j < samplesPerSegment; j += 1) {
      const t = j / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

export type Track = { pts: Pt[]; cum: number[]; length: number };

export function track(points: Pt[]): Track {
  const cum = [0];
  for (let i = 1; i < points.length; i += 1) {
    cum.push(cum[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  return { pts: points, cum, length: cum[cum.length - 1] };
}

/** Point du tracé à une fraction de sa longueur (0 → 1). */
export function pointAt(tr: Track, t: number): Pt {
  const target = Math.max(0, Math.min(1, t)) * tr.length;
  let lo = 0;
  let hi = tr.cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (tr.cum[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  const i = Math.max(1, lo);
  const span = tr.cum[i] - tr.cum[i - 1] || 1;
  const k = (target - tr.cum[i - 1]) / span;
  const a = tr.pts[i - 1];
  const b = tr.pts[i];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
}

/** Fraction de longueur du point le plus proche d'une abscisse donnée (pour poser des nœuds). */
export function fractionAtX(tr: Track, x: number): number {
  let best = 0;
  let bestDist = Infinity;
  tr.pts.forEach((p, i) => {
    const d = Math.abs(p[0] - x);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return tr.cum[best] / tr.length;
}

const toD = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");

/**
 * Le fil corail, tracé jusqu'à `draw` (0 → 1), avec une tête lumineuse.
 * `from` permet d'effacer le début (le fil « avance »).
 */
export function Thread({
  tr,
  draw,
  from = 0,
  width = 3,
  color = C.coral,
  head = true,
  glow = true,
  opacity = 1,
}: {
  tr: Track;
  draw: number;
  from?: number;
  width?: number;
  color?: string;
  head?: boolean;
  glow?: boolean;
  opacity?: number;
}) {
  const d = toD(tr.pts);
  const a = Math.max(0, Math.min(1, from));
  const b = Math.max(a, Math.min(1, draw));
  const [hx, hy] = pointAt(tr, b);
  const showHead = head && b > a + 0.0005 && b < 0.9995;
  // Un tracé de longueur nulle laisserait un point dû à l'extrémité arrondie.
  if (b - a <= 0.0005) return null;
  return (
    <g opacity={opacity}>
      {glow ? (
        <path d={d} fill="none" stroke={color} strokeOpacity={0.18} strokeWidth={width * 5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${b - a} 2`} strokeDashoffset={-a} style={{ filter: "blur(6px)" }} />
      ) : null}
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${b - a} 2`} strokeDashoffset={-a} />
      {showHead ? (
        <g>
          <circle cx={hx} cy={hy} r={width * 6} fill={color} opacity={0.16} />
          <circle cx={hx} cy={hy} r={width * 2.2} fill={color} />
          <circle cx={hx} cy={hy} r={width * 0.9} fill="#fff" opacity={0.85} />
        </g>
      ) : null}
    </g>
  );
}
