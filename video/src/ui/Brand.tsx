import { C, F } from "../theme";

export const LOGO_PATH = "M10 8h8a5 5 0 0 1 0 10h-3.5l6 6h-5l-5.5-5.5V24h-4V8h4Zm0 4v3h7.5a1.5 1.5 0 1 0 0-3H10Z";

export function Logomark({ size = 64, glyph = 1, fill = 1 }: { size?: number; glyph?: number; fill?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ display: "block", overflow: "visible" }}>
      <rect width="32" height="32" rx="8" fill={C.coral} opacity={fill} />
      <path d={LOGO_PATH} fill="white" opacity={glyph} />
    </svg>
  );
}

export function Wordmark({ size = 48 }: { size?: number }) {
  return (
    <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: size, letterSpacing: "-0.03em", color: C.ink, whiteSpace: "nowrap" }}>
      RH <span style={{ color: C.coral }}>Pilot</span>
    </span>
  );
}
