export type DsnComplementaryAffiliation = {
  coverage: "SANTE" | "PREVOYANCE";
  organismCode: string;
  contractReference: string;
  delegateCode: string | null;
  populationCode: string | null;
  optionCode: string | null;
  validFrom: string;
  validUntil: string | null;
  paymentFrequency: "MONTHLY";
  componentCodes: string[];
  sourceReference: string;
};
export type IdentifiedDsnAffiliation = DsnComplementaryAffiliation & { adhesionId: string; affiliationId: string };

const day = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !/^20\d{2}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(new Date(value + "T00:00:00Z").getTime()) || new Date(value + "T00:00:00Z").toISOString().slice(0, 10) !== value) throw new Error(`DSN bloquée : ${label} invalide.`);
  return value;
};
const text = (value: unknown, label: string, limit: number): string => {
  if (typeof value !== "string" || !value.trim() || value.trim().length > limit || /[\u0000-\u001f\u007f-\u009f]/.test(value) || /[^\u0020-\u00ff]/.test(value)) throw new Error(`DSN bloquée : ${label} absent ou invalide.`);
  return value.trim();
};
export function normalizeDsnComplementaryAffiliations(value: unknown): DsnComplementaryAffiliation[] {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value) || value.length > 2) throw new Error("DSN bloquée : les affiliations complémentaires sont invalides.");
  const seen = new Set<string>();
  return value.map((raw): DsnComplementaryAffiliation => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("DSN bloquée : une affiliation complémentaire est invalide.");
    const record = raw as Record<string, unknown>;
    if ((record.coverage !== "SANTE" && record.coverage !== "PREVOYANCE") || seen.has(record.coverage)) throw new Error("DSN bloquée : la couverture complémentaire est inconnue ou dupliquée.");
    seen.add(record.coverage);
    const organismCode = text(record.organismCode, "le code organisme complémentaire", 9).toUpperCase();
    if (!/^(P\d{4}|A[A-Z0-9]{5}|[A-Z0-9]{9})$/.test(organismCode)) throw new Error("DSN bloquée : le code organisme complémentaire doit être repris de la fiche de paramétrage.");
    const validFrom = day(record.validFrom, "la date d'affiliation");
    const validUntil = record.validUntil == null || record.validUntil === "" ? null : day(record.validUntil, "la fin d'affiliation");
    if (validUntil && validUntil < validFrom) throw new Error("DSN bloquée : les dates d'affiliation sont inversées.");
    if (record.paymentFrequency !== "MONTHLY") throw new Error("DSN bloquée : les paiements complémentaires trimestriels ou annuels nécessitent leur échéancier.");
    const components = record.coverage === "SANTE" ? ["20"] : ["11", "24"];
    if (!Array.isArray(record.componentCodes) || record.componentCodes.length !== components.length || record.componentCodes.some((code, i) => code !== components[i])) throw new Error("DSN bloquée : seuls les contrats santé à montant forfaitaire et prévoyance sur tranches A et 2 unifiée sont actuellement raccordés.");
    const optional = (key: string, label: string, length: number): string | null => record[key] == null || record[key] === "" ? null : text(record[key], label, length);
    const delegateCode = optional("delegateCode", "le délégataire complémentaire", 6);
    if (delegateCode && delegateCode.length !== 6) throw new Error("DSN bloquée : le code délégataire doit comporter six caractères.");
    return { coverage: record.coverage, organismCode, contractReference: text(record.contractReference, "la référence de contrat complémentaire", 30), delegateCode, populationCode: optional("populationCode", "la population complémentaire", 30), optionCode: optional("optionCode", "l'option complémentaire", 30), validFrom, validUntil, paymentFrequency: "MONTHLY", componentCodes: components, sourceReference: text(record.sourceReference, "la référence de fiche de paramétrage", 200) };
  });
}

/** Un identifiant d'adhésion par organisme/délégataire/contrat ; identifiants d'affiliation par salarié. */
export function identifyDsnAffiliations(configurations: readonly DsnComplementaryAffiliation[][]): IdentifiedDsnAffiliation[][] {
  const adhesionIds = new Map<string, string>();
  return configurations.map((configuration) => configuration.map((affiliation, index) => {
    const key = JSON.stringify([affiliation.organismCode, affiliation.delegateCode, affiliation.contractReference]);
    if (!adhesionIds.has(key)) adhesionIds.set(key, String(adhesionIds.size + 1));
    if (adhesionIds.size > 999) throw new Error("DSN bloquée : trop de contrats complémentaires dans une même déclaration.");
    return { ...affiliation, adhesionId: adhesionIds.get(key)!, affiliationId: String(index + 1) };
  }));
}
