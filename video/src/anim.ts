import { Easing, interpolate, spring } from "remotion";
import { FPS } from "./theme";

export const ease = Easing.bezier(0.16, 1, 0.3, 1); // sortie douce
export const inOut = Easing.bezier(0.65, 0, 0.35, 1); // mouvement de caméra
export const snap = Easing.bezier(0.3, 1.5, 0.5, 1); // petit rebond

export const s = (seconds: number) => Math.round(seconds * FPS);

/** 0 → 1 entre deux instants (en images), avec une courbe. */
export function prog(frame: number, from: number, duration: number, easing = ease) {
  return interpolate(frame, [from, from + duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

export function pop(frame: number, from: number, fps = FPS) {
  return spring({ frame: frame - from, fps, config: { damping: 14, stiffness: 160, mass: 0.7 } });
}

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Texte tapé au clavier : nombre de caractères visibles à cet instant. */
export function typed(text: string, frame: number, from: number, charsPerSecond = 22) {
  const n = Math.floor(((frame - from) / FPS) * charsPerSecond);
  return text.slice(0, Math.max(0, Math.min(text.length, n)));
}

/** Nombre qui défile jusqu'à sa valeur. */
export function count(frame: number, from: number, duration: number, target: number, decimals = 0) {
  const value = target * prog(frame, from, duration, inOut);
  return value.toFixed(decimals);
}

export const euros = (value: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(value).replace(/ /g, " ");
