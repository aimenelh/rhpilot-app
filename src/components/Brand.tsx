// Identité RH Pilot, « le R d'un seul fil » (octobre 2026).
// Le R est tracé d'un seul trait ; sa jambe devient le fil corail qui souligne
// « H Pilot » et se termine par le point des échéances. Les lettres « H Pilot »
// sont vectorisées depuis DM Sans 600 : la signature ne dépend d'aucune police chargée.
// Maquettes et déclinaisons : canevas « RH Pilot, pistes de logo ».

const INK = "#14151A";
const CORAL_TEXT = "#D2381F"; // corail lisible sur fond clair (texte, fil, point)
const CORAL = "#E8432E"; // corail du logo : fond des icônes, fil sur fond encre

export const R_PATH = "M5.5 47.5 V22 H17 C23.2 22 27 25.8 27 30.5 C27 35.2 23.2 39 17 39 H11 C16 39 18.5 43 21 47 C23.8 51.5 27 55.5 33 55.5";
export const THREAD_PATH = "M29 55.5 H196";
export const H_PATH = "M53.6 50V19.2H58.88V50ZM34.12 50V19.2H39.4V50ZM38.62 36.43V32.14H54.58V36.43Z";
export const PILOT_PATH = "M73.47 50V19.2H84.54Q88.27 19.2 90.7 20.46Q93.14 21.71 94.32 23.83Q95.49 25.94 95.49 28.66Q95.49 31.19 94.34 33.33Q93.18 35.46 90.76 36.78Q88.35 38.09 84.54 38.09H78.75V50ZM78.75 33.79H84.3Q87.39 33.79 88.75 32.38Q90.11 30.97 90.11 28.66Q90.11 26.22 88.75 24.87Q87.39 23.52 84.3 23.52H78.75ZM98.89 50V27.82H104.17V50ZM101.54 24.3Q100.08 24.3 99.14 23.41Q98.21 22.52 98.21 21.18Q98.21 19.83 99.14 18.96Q100.08 18.1 101.54 18.1Q103 18.1 103.94 18.96Q104.89 19.83 104.89 21.18Q104.89 22.52 103.94 23.41Q103 24.3 101.54 24.3ZM109.12 50V18.32H114.4V50ZM129.4 50.53Q126.26 50.53 123.74 49.06Q121.22 47.6 119.78 44.98Q118.33 42.36 118.33 38.96Q118.33 35.46 119.79 32.84Q121.25 30.21 123.77 28.75Q126.29 27.3 129.43 27.3Q132.67 27.3 135.17 28.75Q137.66 30.21 139.13 32.84Q140.6 35.46 140.6 38.91Q140.6 42.36 139.12 44.98Q137.64 47.6 135.13 49.06Q132.62 50.53 129.4 50.53ZM129.42 45.98Q131 45.98 132.3 45.18Q133.6 44.39 134.41 42.81Q135.21 41.23 135.21 38.91Q135.21 36.57 134.42 35Q133.63 33.43 132.34 32.64Q131.06 31.85 129.45 31.85Q127.91 31.85 126.59 32.64Q125.26 33.43 124.49 35Q123.72 36.57 123.72 38.91Q123.72 41.23 124.5 42.81Q125.28 44.39 126.57 45.18Q127.86 45.98 129.42 45.98ZM153.26 50Q151.04 50 149.38 49.3Q147.72 48.6 146.81 46.98Q145.9 45.35 145.9 42.55V32.24H142.07V27.82H145.9L146.5 21.96H151.17V27.82H157.17V32.24H151.18V42.58Q151.18 44.25 151.89 44.88Q152.6 45.5 154.35 45.5H157.07V50Z";

/**
 * Signature complète (logo-texte). `height` en px ; la largeur suit (rapport 215/64).
 * `tone="dark"` pour un fond encre.
 */
export function Signature({ height = 30, tone = "light", className, animated = false }: { height?: number; tone?: "light" | "dark"; className?: string; animated?: boolean }) {
  const dark = tone === "dark";
  const letters = dark ? "#FFFFFF" : INK;
  const coral = dark ? CORAL : CORAL_TEXT;
  // `animated` : classes et longueur normalisée pour l'introduction animée (BrandIntro).
  const draw = animated ? { pathLength: 1 } : {};
  return (
    <svg
      width={(height * 215) / 64}
      height={height}
      viewBox="0 0 215 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="RH Pilot"
      className={className}
    >
      <path className={animated ? "sig-r" : undefined} {...draw} d={R_PATH} stroke={letters} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round" />
      <path className={animated ? "sig-thread" : undefined} {...draw} d={THREAD_PATH} stroke={coral} strokeWidth={5.6} strokeLinecap="round" />
      <circle className={animated ? "sig-ring" : undefined} cx={205} cy={55.5} r={6.5} stroke={coral} strokeWidth={4.4} />
      <path className={animated ? "sig-h" : undefined} d={H_PATH} fill={letters} />
      <path className={animated ? "sig-pilot" : undefined} d={PILOT_PATH} fill={coral} />
    </svg>
  );
}

/**
 * Icône seule : le R d'un seul fil dans un carré corail.
 * En grand (≥ 40 px), la jambe du R s'achève sur le point ; en petit, le R seul, plus épais, reste net.
 */
export function Logomark({ size = 28 }: { size?: number }) {
  const large = size >= 40;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill={CORAL} />
      {large ? (
        <g transform="translate(-2.7 0)">
          <path
            d="M17 46 V14 H28.5 C35.5 14 39.5 18.5 39.5 24 C39.5 29.5 35.5 34 28.5 34 H22.5 C28 34 30.5 38.5 33.5 43 C35.2 45.6 37.5 47.5 41 47.5 H45"
            stroke="#FFFFFF"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={50.5} cy={47.5} r={4.6} stroke="#FFFFFF" strokeWidth={3.8} />
        </g>
      ) : (
        <path
          transform="translate(-1.5 0)"
          d="M20 50 V14 H32 C39.5 14 44 18.8 44 24.5 C44 30.2 39.5 35 32 35 H25.5 C31.5 35 34 40 37.5 45 C40 48.5 42.5 50 47 50"
          stroke="#FFFFFF"
          strokeWidth={size <= 20 ? 9.5 : 8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/** La signature en SVG autonome (image Open Graph, e-mails, exports). */
export function signatureSvg(tone: "light" | "dark" = "light"): string {
  const dark = tone === "dark";
  const letters = dark ? "#FFFFFF" : INK;
  const coral = dark ? CORAL : CORAL_TEXT;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="430" height="128" viewBox="0 0 215 64" fill="none"><path d="${R_PATH}" stroke="${letters}" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round"/><path d="${THREAD_PATH}" stroke="${coral}" stroke-width="5.6" stroke-linecap="round"/><circle cx="205" cy="55.5" r="6.5" stroke="${coral}" stroke-width="4.4"/><path d="${H_PATH}" fill="${letters}"/><path d="${PILOT_PATH}" fill="${coral}"/></svg>`;
}
