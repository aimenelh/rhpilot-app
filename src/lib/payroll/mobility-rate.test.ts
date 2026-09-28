import { describe, expect, it, vi } from "vitest";
import { describeMobilityRate, fetchMobilityRate, normalizeUrssafDate, parseUrssafMobilityRecords, selectMobilityRate } from "./mobility-rate";

// Lignes réelles du jeu de données Urssaf « table_taux_vmrr » pour Montpellier (34172),
// complétées d'une période en cours fictive pour tester la sélection et l'addition des taux.
const MONTPELLIER = {
  total_count: 7,
  results: [
    { code_commune: "34172", nom_commune: "MONTPELLIER", region: "LANGUEDOC-ROUSSILLON", date_debut: "19950101", date_fin: "19951231", taux_vm: 1.4, taux_vma: null, taux_vmr: null },
    { code_commune: "34172", nom_commune: "MONTPELLIER", region: "LANGUEDOC-ROUSSILLON", date_debut: "19960101", date_fin: "20010730", taux_vm: 1.75, taux_vma: null, taux_vmr: null },
    { code_commune: "34172", nom_commune: "MONTPELLIER", region: "LANGUEDOC-ROUSSILLON", date_debut: "19820101", date_fin: "19870331", taux_vm: 1.0, taux_vma: null, taux_vmr: null },
    { code_commune: "34172", nom_commune: "MONTPELLIER", region: "LANGUEDOC-ROUSSILLON", date_debut: "20010801", date_fin: "20040831", taux_vm: 1.75, taux_vma: null, taux_vmr: null },
    { code_commune: "34172", nom_commune: "MONTPELLIER", region: "LANGUEDOC-ROUSSILLON", date_debut: "20110601", date_fin: "20251031", taux_vm: 2.0, taux_vma: null, taux_vmr: null },
    { code_commune: "34172", nom_commune: "MONTPELLIER", region: "OCCITANIE", date_debut: "20251101", date_fin: null, taux_vm: 2.0, taux_vma: null, taux_vmr: 0.15 },
    { code_commune: "34999", nom_commune: "AUTRE", region: "OCCITANIE", date_debut: "20200101", date_fin: null, taux_vm: 1, taux_vma: null, taux_vmr: null },
  ],
};

describe("normalizeUrssafDate", () => {
  it("accepte les formats compact, ISO et français", () => {
    expect(normalizeUrssafDate("20251101")).toBe("2025-11-01");
    expect(normalizeUrssafDate("2025-11-01T00:00:00+00:00")).toBe("2025-11-01");
    expect(normalizeUrssafDate("01/11/2025")).toBe("2025-11-01");
    expect(normalizeUrssafDate(null)).toBeNull();
  });
});

describe("selectMobilityRate", () => {
  const records = parseUrssafMobilityRecords(MONTPELLIER);

  it("lit toutes les lignes exploitables", () => {
    expect(records).toHaveLength(7);
    expect(records[0]).toMatchObject({ communeCode: "34172", from: "1995-01-01", until: "1995-12-31", vm: 1.4, vma: 0, vmr: 0 });
  });

  it("retient le taux en vigueur à la date de paie", () => {
    expect(selectMobilityRate(records, "34172", "2024-06-01")).toMatchObject({ ratePercent: 2, validFrom: "2011-06-01", applicable: true });
    expect(selectMobilityRate(records, "34172", "2003-01-01").ratePercent).toBe(1.75);
  });

  it("additionne versement mobilité, additionnel et régional", () => {
    const selection = selectMobilityRate(records, "34172", "2026-12-01");
    expect(selection).toMatchObject({ ratePercent: 2.15, components: { vm: 2, vma: 0, vmr: 0.15 }, validFrom: "2025-11-01", validUntil: null });
    expect(describeMobilityRate(selection)).toBe("Barème Urssaf : MONTPELLIER (34172), 2 % VM + 0.15 % régional, en vigueur depuis le 01/11/2025.");
  });

  it("renvoie 0 pour une commune absente du barème ou hors période", () => {
    expect(selectMobilityRate(records, "30189", "2026-12-01")).toMatchObject({ ratePercent: 0, applicable: false });
    expect(selectMobilityRate(records, "34172", "1990-01-01")).toMatchObject({ ratePercent: 0, applicable: false });
  });

  it("lit aussi l'ancien format records[].record.fields et le champ taux_vmrr", () => {
    const legacy = parseUrssafMobilityRecords({ records: [{ record: { fields: { code_commune: "75056", date_debut: "2024-01-01", taux_vm: 3.2, taux_vmrr: 0.2 } } }] });
    expect(selectMobilityRate(legacy, "75056", "2026-01-01").ratePercent).toBe(3.4);
  });
});

describe("fetchMobilityRate", () => {
  const response = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => body });

  it("interroge l'Urssaf et sélectionne le taux du jour", async () => {
    const fetchImpl = vi.fn(async (_url: string) => response(MONTPELLIER));
    await expect(fetchMobilityRate("34172", "2026-12-01", { fetchImpl })).resolves.toMatchObject({ status: "RESOLVED", ratePercent: 2.15 });
    expect(fetchImpl.mock.calls[0][0]).toContain("code_commune%3D%2234172%22");
  });

  it("remonte de l'arrondissement parisien à Paris si nécessaire", async () => {
    const paris = { results: [{ code_commune: "75056", nom_commune: "PARIS", date_debut: "20240101", date_fin: null, taux_vm: 3.2 }] };
    const fetchImpl = vi.fn(async (url: string) => response(url.includes("75056") ? paris : { results: [] }));
    await expect(fetchMobilityRate("75109", "2026-12-01", { fetchImpl })).resolves.toMatchObject({ status: "RESOLVED", ratePercent: 3.2, communeCode: "75056" });
  });

  it("confirme par la recherche plein texte avant de conclure à un taux nul", async () => {
    const fetchImpl = vi.fn(async (url: string) => response(url.includes("code_commune") ? { results: [] } : MONTPELLIER));
    await expect(fetchMobilityRate("34172", "2026-12-01", { fetchImpl })).resolves.toMatchObject({ ratePercent: 2.15 });
  });

  it("ne conclut pas à 0 si la recherche de confirmation échoue", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes("code_commune")) return response({ results: [] });
      throw new Error("réseau");
    });
    await expect(fetchMobilityRate("34172", "2026-12-01", { fetchImpl })).resolves.toMatchObject({ status: "UNAVAILABLE" });
  });

  it("ne conclut pas à 0 quand l'Urssaf ne répond pas", async () => {
    const fetchImpl = vi.fn(async () => response({}, false));
    await expect(fetchMobilityRate("34172", "2026-12-01", { fetchImpl })).resolves.toMatchObject({ status: "UNAVAILABLE" });
  });
});
