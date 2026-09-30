import { describe, expect, it } from "vitest";
import { assertPeriodWorkTimeStable, dayBefore, selectPeriodProfile } from "./profile-selection";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const november = [d("2026-11-01"), new Date("2026-11-30T23:59:59.999Z")] as const;

describe("profil de paie du mois", () => {
  it("bloque un passage à temps partiel en milieu de mois plutôt que d'appliquer 24 h au mois entier", () => {
    const profiles = [{ id: "old", baseSalaryCents: 250000, effectiveFrom: d("2026-01-01"), effectiveUntil: d("2026-11-15"), hours: 35 }, { id: "new", baseSalaryCents: 180000, effectiveFrom: d("2026-11-16"), effectiveUntil: null, hours: 24 }];
    expect(() => assertPeriodWorkTimeStable(profiles, ...november, profile => String(profile.hours))).toThrow(/deux périodes/);
  });
  it("accepte le changement au premier du mois et une augmentation sans modification horaire", () => {
    const profiles = [{ id: "old", baseSalaryCents: 250000, effectiveFrom: d("2026-01-01"), effectiveUntil: d("2026-11-01"), hours: 35 }, { id: "new", baseSalaryCents: 180000, effectiveFrom: d("2026-11-01"), effectiveUntil: null, hours: 24 }];
    expect(() => assertPeriodWorkTimeStable(profiles, ...november, profile => String(profile.hours))).not.toThrow();
    profiles[0].effectiveUntil = d("2026-11-15"); profiles[1].effectiveFrom = d("2026-11-16"); profiles[1].hours = 35;
    expect(() => assertPeriodWorkTimeStable(profiles, ...november, profile => String(profile.hours))).not.toThrow();
  });
  it("garde le seul profil applicable", () => {
    const result = selectPeriodProfile([{ id: "a", baseSalaryCents: 250000, effectiveFrom: d("2026-01-01"), effectiveUntil: null }], ...november);
    expect(result).toMatchObject({ ok: true, baseSalaryCents: 250000, warning: null });
  });

  it("une augmentation au 1er du mois ne bloque plus : l'ancien profil finit la veille", () => {
    const profiles = [
      { id: "old", baseSalaryCents: 250000, effectiveFrom: d("2026-01-01"), effectiveUntil: dayBefore(d("2026-11-01")) },
      { id: "new", baseSalaryCents: 280000, effectiveFrom: d("2026-11-01"), effectiveUntil: null },
    ];
    expect(dayBefore(d("2026-11-01")).toISOString().slice(0, 10)).toBe("2026-10-31");
    const result = selectPeriodProfile(profiles, ...november);
    expect(result).toMatchObject({ ok: true, baseSalaryCents: 280000, warning: null });
    if (result.ok) expect(result.profile.id).toBe("new");
  });

  it("tolère les anciens profils terminés le jour même du suivant", () => {
    const profiles = [
      { id: "old", baseSalaryCents: 250000, effectiveFrom: d("2026-01-01"), effectiveUntil: d("2026-11-01") },
      { id: "new", baseSalaryCents: 280000, effectiveFrom: d("2026-11-01"), effectiveUntil: null },
    ];
    expect(selectPeriodProfile(profiles, ...november)).toMatchObject({ ok: true, baseSalaryCents: 280000 });
  });

  it("proratise un changement en milieu de mois sur les jours calendaires", () => {
    const profiles = [
      { id: "old", baseSalaryCents: 300000, effectiveFrom: d("2026-01-01"), effectiveUntil: d("2026-11-15") },
      { id: "new", baseSalaryCents: 330000, effectiveFrom: d("2026-11-16"), effectiveUntil: null },
    ];
    const result = selectPeriodProfile(profiles, ...november);
    // 15 jours à 3 000 € et 15 jours à 3 300 €.
    expect(result).toMatchObject({ ok: true, baseSalaryCents: 315000 });
    if (result.ok) {
      expect(result.profile.id).toBe("new");
      expect(result.warning).toMatch(/proratisé/);
    }
  });

  it("bloque un vrai chevauchement", () => {
    const profiles = [
      { id: "old", baseSalaryCents: 300000, effectiveFrom: d("2026-01-01"), effectiveUntil: d("2026-11-20") },
      { id: "new", baseSalaryCents: 330000, effectiveFrom: d("2026-11-10"), effectiveUntil: null },
    ];
    expect(selectPeriodProfile(profiles, ...november)).toMatchObject({ ok: false });
  });
});
