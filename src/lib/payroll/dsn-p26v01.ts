import type { DsnPasData } from "./pas-dsn";

export const DSN_NORM_VERSION = "P26V01";

export type DsnP26MonthlyInput = {
  testMode: boolean;
  declarationOrder: number;
  fileDate: Date;
  emitter: {
    siret: string;
    name: string;
    address: string;
    postalCode: string;
    city: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
  };
  establishment: {
    nafCode: string;
  };
  period: {
    year: number;
    month: number;
    paymentDate: Date;
  };
  employees: Array<{
    nir: string;
    lastName: string;
    firstName: string;
    sexCode?: "01" | "02" | null;
    birthDate: Date;
    birthPlace: string;
    birthDepartment: string;
    addressLine: string;
    postalCode: string;
    city: string;
    countryCode?: string | null;
    position: string;
    contract: {
      startDate: Date;
      endDate?: Date | null;
      contractNumber: string;
      contractNatureCode: string;
      publicPolicyCode: string;
      pcsEsecCode: string;
      conventionalStatusCode: string;
      retirementStatusCode: string;
      workUnitCode: string;
      referenceWorkQuota: number;
      contractWorkQuota: number;
      workModalityCode: string;
      collectiveAgreementCode: string;
      sicknessRegimeCode: string;
      oldAgeRegimeCode: string;
    };
    payroll: {
      baseSalary: number;
      grossAmount: number;
      netBeforeTax: number;
      netTaxableAmount: number;
      netSocialAmount: number;
      withholdingTax: number;
      pas: DsnPasData;
    };
  }>;
};

type DsnLine = { code: string; value: string };

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function dsnDate(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error("DSN bloquée : une date nécessaire au fichier est invalide.");
  }
  return `${pad2(date.getUTCDate())}${pad2(date.getUTCMonth() + 1)}${date.getUTCFullYear()}`;
}

function monthBounds(year: number, month: number): { start: Date; end: Date } {
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("DSN bloquée : le mois principal déclaré est invalide.");
  }
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0)),
  };
}

function money(value: number): string {
  if (!Number.isFinite(value)) throw new Error("DSN bloquée : un montant est invalide.");
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

function decimal(value: number): string {
  if (!Number.isFinite(value)) throw new Error("DSN bloquée : une valeur décimale est invalide.");
  return String(Math.round((value + Number.EPSILON) * 100) / 100);
}

function assertLatin1(value: string, label: string): void {
  for (const character of value) {
    if (character.charCodeAt(0) > 255) {
      throw new Error(`DSN bloquée : ${label} contient un caractère hors ISO-8859-1 (${JSON.stringify(character)}).`);
    }
  }
}

function normalizeText(value: string, label: string, optional = false): string | null {
  if (/[\r\n\0]/.test(value)) {
    throw new Error(`DSN bloquée : ${label} contient un caractère de contrôle incompatible avec le format DSN.`);
  }
  const normalized = value.trim().replace(/[\t\f\v ]+/g, " ");
  if (!normalized) {
    if (optional) return null;
    throw new Error(`DSN bloquée : ${label} est absent.`);
  }
  assertLatin1(normalized, label);
  return normalized;
}

function text(value: string, label: string): string {
  return normalizeText(value, label) as string;
}

function optionalText(value: string | null | undefined): string | null {
  return normalizeText(value ?? "", "une donnée facultative", true);
}

function assertDigits(value: string, length: number, label: string): string {
  const normalized = value.replace(/\s+/g, "");
  if (!new RegExp(`^\\d{${length}}$`).test(normalized)) {
    throw new Error(`DSN bloquée : ${label} doit contenir exactement ${length} chiffres.`);
  }
  return normalized;
}

function assertCode(value: string, label: string, min = 1, max = 20): string {
  const normalized = value.trim().toUpperCase();
  if (normalized.length < min || normalized.length > max || !/^[A-Z0-9.-]+$/.test(normalized)) {
    throw new Error(`DSN bloquée : ${label} est invalide.`);
  }
  return normalized;
}

function add(lines: DsnLine[], code: string, value: string | number | null | undefined): void {
  if (value === null || value === undefined || value === "") return;
  if (!/^[A-Z0-9]+(?:\.[A-Z0-9]+)+$/.test(code)) {
    throw new Error(`DSN bloquée : code de rubrique invalide (${code}).`);
  }
  const rendered = String(value);
  assertLatin1(rendered, `la rubrique ${code}`);
  if (/[\r\n\0]/.test(rendered)) {
    throw new Error(`DSN bloquée : la rubrique ${code} contient un caractère de contrôle.`);
  }
  lines.push({ code, value: rendered });
}

function serialize(lines: DsnLine[]): string {
  const rendered = lines.map((line) => {
    const value = `${line.code},'${line.value}'`;
    if (Buffer.byteLength(value, "latin1") > 256) {
      throw new Error(`DSN bloquée : la rubrique ${line.code} dépasse la longueur physique maximale de 256 caractères.`);
    }
    return value;
  });
  return `${rendered.join("\r\n")}\r\n`;
}

function siretParts(siretValue: string): { siren: string; nic: string; siret: string } {
  const siret = assertDigits(siretValue, 14, "le SIRET");
  return { siren: siret.slice(0, 9), nic: siret.slice(9), siret };
}

function addRemuneration(
  lines: DsnLine[],
  periodStart: Date,
  periodEnd: Date,
  contractNumber: string,
  type: "001" | "002" | "003" | "010",
  amount: number,
): void {
  add(lines, "S21.G00.51.001", dsnDate(periodStart));
  add(lines, "S21.G00.51.002", dsnDate(periodEnd));
  add(lines, "S21.G00.51.010", contractNumber);
  add(lines, "S21.G00.51.011", type);
  add(lines, "S21.G00.51.013", money(amount));
}

/**
 * Produit une DSN mensuelle P26V01 destinée au pré-contrôle technique.
 *
 * Cette fonction ne fabrique aucune nomenclature métier : les codes de contrat,
 * PCS-ESE, statut conventionnel, régimes et modalité de travail doivent avoir
 * été explicitement renseignés et validés en amont. Les blocs de paiements et
 * cotisations organisme (S21.G00.20/22/23/81/82) ne sont volontairement pas
 * inventés ici : tant que leurs mappings ne sont pas disponibles, l'export
 * reste un candidat de pré-contrôle et ne peut pas être présenté comme une DSN
 * prête au dépôt.
 */
export function buildDsnP26V01Monthly(input: DsnP26MonthlyInput): string {
  const lines: DsnLine[] = [];
  const { siren, nic } = siretParts(input.emitter.siret);
  const { start: periodStart, end: periodEnd } = monthBounds(input.period.year, input.period.month);
  const nafCode = assertCode(input.establishment.nafCode.replace(/\s+/g, ""), "le code APE/NAF", 4, 6);

  if (!Number.isInteger(input.declarationOrder) || input.declarationOrder < 1 || input.declarationOrder > 99) {
    throw new Error("DSN bloquée : le numéro d'ordre de la déclaration doit être compris entre 1 et 99.");
  }
  if (input.employees.length === 0) throw new Error("DSN bloquée : aucun salarié calculé n'est présent dans la période.");

  // S10 — envoi, émetteur et contact.
  add(lines, "S10.G00.00.001", "RH Pilot");
  add(lines, "S10.G00.00.002", "RH Pilot");
  add(lines, "S10.G00.00.003", "0.1.0");
  add(lines, "S10.G00.00.005", input.testMode ? "01" : "02");
  add(lines, "S10.G00.00.006", DSN_NORM_VERSION);
  add(lines, "S10.G00.00.007", "01");
  add(lines, "S10.G00.00.008", "01");

  add(lines, "S10.G00.01.001", siren);
  add(lines, "S10.G00.01.002", nic);
  add(lines, "S10.G00.01.003", text(input.emitter.name, "la raison sociale de l'émetteur"));
  add(lines, "S10.G00.01.004", text(input.emitter.address, "l'adresse de l'émetteur"));
  add(lines, "S10.G00.01.005", text(input.emitter.postalCode, "le code postal de l'émetteur"));
  add(lines, "S10.G00.01.006", text(input.emitter.city, "la ville de l'émetteur"));
  add(lines, "S10.G00.02.002", text(input.emitter.contactName, "le nom du contact DSN"));
  add(lines, "S10.G00.02.004", text(input.emitter.contactEmail, "l'email du contact DSN"));
  add(lines, "S10.G00.02.005", text(input.emitter.contactPhone, "le téléphone du contact DSN"));

  // S20 — une DSN mensuelle normale, fraction unique 1/1.
  add(lines, "S20.G00.05.001", "01");
  add(lines, "S20.G00.05.002", "01");
  add(lines, "S20.G00.05.003", "11");
  add(lines, "S20.G00.05.004", String(input.declarationOrder));
  add(lines, "S20.G00.05.005", dsnDate(periodStart));
  add(lines, "S20.G00.05.007", dsnDate(input.fileDate));
  add(lines, "S20.G00.05.008", "01");
  add(lines, "S20.G00.05.010", "01");

  // Entreprise / établissement.
  add(lines, "S21.G00.06.001", siren);
  add(lines, "S21.G00.11.001", nic);
  add(lines, "S21.G00.11.002", nafCode);
  add(lines, "S21.G00.11.003", text(input.emitter.address, "l'adresse de l'établissement"));
  add(lines, "S21.G00.11.004", text(input.emitter.postalCode, "le code postal de l'établissement"));
  add(lines, "S21.G00.11.005", text(input.emitter.city, "la ville de l'établissement"));

  for (const employee of input.employees) {
    const nir = assertDigits(employee.nir, 13, "le NIR");
    const contractNumber = assertCode(employee.contract.contractNumber, "le numéro de contrat", 5, 20);

    add(lines, "S21.G00.30.001", nir);
    add(lines, "S21.G00.30.002", text(employee.lastName, "le nom de famille du salarié"));
    add(lines, "S21.G00.30.004", text(employee.firstName, "le prénom du salarié"));
    add(lines, "S21.G00.30.005", employee.sexCode ?? null);
    add(lines, "S21.G00.30.006", dsnDate(employee.birthDate));
    add(lines, "S21.G00.30.007", text(employee.birthPlace, "le lieu de naissance du salarié"));
    add(lines, "S21.G00.30.008", text(employee.addressLine, "l'adresse du salarié"));
    add(lines, "S21.G00.30.009", text(employee.postalCode, "le code postal du salarié"));
    add(lines, "S21.G00.30.010", text(employee.city, "la ville du salarié"));
    add(lines, "S21.G00.30.011", optionalText(employee.countryCode));
    add(lines, "S21.G00.30.014", text(employee.birthDepartment, "le département de naissance du salarié"));

    add(lines, "S21.G00.40.001", dsnDate(employee.contract.startDate));
    add(lines, "S21.G00.40.002", assertCode(employee.contract.conventionalStatusCode, "le statut conventionnel"));
    add(lines, "S21.G00.40.003", assertCode(employee.contract.retirementStatusCode, "le statut retraite complémentaire"));
    add(lines, "S21.G00.40.004", assertCode(employee.contract.pcsEsecCode, "le code PCS-ESE", 3, 6));
    add(lines, "S21.G00.40.006", text(employee.position, "l'emploi du salarié"));
    add(lines, "S21.G00.40.007", assertCode(employee.contract.contractNatureCode, "la nature du contrat"));
    add(lines, "S21.G00.40.008", assertCode(employee.contract.publicPolicyCode, "le dispositif de politique publique"));
    add(lines, "S21.G00.40.009", contractNumber);
    add(lines, "S21.G00.40.010", employee.contract.endDate ? dsnDate(employee.contract.endDate) : null);
    add(lines, "S21.G00.40.011", assertCode(employee.contract.workUnitCode, "l'unité de mesure de la quotité"));
    add(lines, "S21.G00.40.012", decimal(employee.contract.referenceWorkQuota));
    add(lines, "S21.G00.40.013", decimal(employee.contract.contractWorkQuota));
    add(lines, "S21.G00.40.014", assertCode(employee.contract.workModalityCode, "la modalité d'exercice du temps de travail"));
    add(lines, "S21.G00.40.017", assertCode(employee.contract.collectiveAgreementCode, "le code de convention collective"));
    add(lines, "S21.G00.40.018", assertCode(employee.contract.sicknessRegimeCode, "le régime maladie"));
    add(lines, "S21.G00.40.020", assertCode(employee.contract.oldAgeRegimeCode, "le régime vieillesse"));

    // Versement individuel. Le PAS n'est pas retranché de S21.G00.50.004.
    add(lines, "S21.G00.50.001", dsnDate(input.period.paymentDate));
    add(lines, "S21.G00.50.002", money(employee.payroll.netTaxableAmount));
    add(lines, "S21.G00.50.003", "01");
    add(lines, "S21.G00.50.004", money(employee.payroll.netBeforeTax));
    add(lines, "S21.G00.50.006", money(employee.payroll.pas.ratePercent));
    add(lines, "S21.G00.50.007", employee.payroll.pas.rateType);
    add(lines, "S21.G00.50.008", employee.payroll.pas.rateIdentifier);
    add(lines, "S21.G00.50.009", money(employee.payroll.pas.withholdingAmount));
    add(lines, "S21.G00.50.013", money(employee.payroll.pas.amountSubjectToPas));

    // Sur le périmètre volontairement simple (aucune variable ni absence), le
    // salaire rétabli correspond au salaire de base qu'aurait perçu le salarié
    // s'il avait travaillé normalement pendant tout le mois.
    addRemuneration(lines, periodStart, periodEnd, contractNumber, "001", employee.payroll.grossAmount);
    addRemuneration(lines, periodStart, periodEnd, contractNumber, "002", employee.payroll.grossAmount);
    addRemuneration(lines, periodStart, periodEnd, contractNumber, "003", employee.payroll.baseSalary);
    addRemuneration(lines, periodStart, periodEnd, contractNumber, "010", employee.payroll.baseSalary);

    // Montant net social.
    add(lines, "S21.G00.58.001", dsnDate(periodStart));
    add(lines, "S21.G00.58.002", dsnDate(periodEnd));
    add(lines, "S21.G00.58.003", "03");
    add(lines, "S21.G00.58.004", money(employee.payroll.netSocialAmount));

    // Base brute déplafonnée. Les cotisations individuelles sont ajoutées
    // ultérieurement uniquement lorsqu'un mapping NEODeS vérifié existe.
    add(lines, "S21.G00.78.001", "03");
    add(lines, "S21.G00.78.002", dsnDate(periodStart));
    add(lines, "S21.G00.78.003", dsnDate(periodEnd));
    add(lines, "S21.G00.78.004", money(employee.payroll.grossAmount));
  }

  // S90.001 compte toutes les rubriques, y compris les deux rubriques S90.
  add(lines, "S90.G00.90.001", String(lines.length + 2));
  add(lines, "S90.G00.90.002", "1");
  return serialize(lines);
}
