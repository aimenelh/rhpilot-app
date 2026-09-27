import { describe, expect, it } from "vitest";
import { checkSiret, normalizeSiret } from "./siret";

describe("SIRET", () => {
  it("accepte un SIRET valide, avec ou sans espaces", () => {
    // SIRET du siège de l'Insee (clé de Luhn correcte).
    expect(checkSiret("12002701600563")).toEqual({ ok: true, siret: "12002701600563" });
    expect(checkSiret("120 027 016 00563")).toEqual({ ok: true, siret: "12002701600563" });
  });

  it("applique l'exception de La Poste (somme des chiffres multiple de 5)", () => {
    expect(checkSiret("35600000000048").ok).toBe(true); // siège : clé de Luhn
    expect(checkSiret("35600000049837").ok).toBe(true); // établissement : somme multiple de 5
    expect(checkSiret("12002701600572").ok).toBe(false); // clé fausse, hors La Poste
  });

  it("refuse l'absence, la mauvaise longueur, les lettres et une clé fausse", () => {
    expect(checkSiret("").ok).toBe(false);
    expect(checkSiret(null).ok).toBe(false);
    expect(checkSiret("1234567890123").ok).toBe(false);
    expect(checkSiret("1200270160056A").ok).toBe(false);
    expect(checkSiret("12002701600564").ok).toBe(false);
  });

  it("retire espaces, points et tirets", () => {
    expect(normalizeSiret(" 120.027.016-00563 ")).toBe("12002701600563");
  });
});
