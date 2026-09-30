import { buildDsnP26V01Monthly, type DsnP26MonthlyInput } from "./dsn-p26v01";
import { assertUrssafAggregateMapping, assertUrssafIndividualMapping } from "./dsn-urssaf-mapping";

export type DsnIndividualContribution = {
  employeeNir: string;
  code: string;
  /** Base S21.G00.78 parente (02 plafonnée, 03 déplafonnée, 04 CSG...). */
  baseCode: string;
  opsIdentifier: string | null;
  baseAmount?: number | null;
  contributionAmount?: number | null;
  ratePercent?: number | null;
  inseeCommuneCode?: string | null;
  sourcePayrollCode: string;
  mappingVersion: string;
};

export type DsnAggregatedContribution = {
  code: string;
  baseQualifier: string;
  baseAmount?: number | null;
  contributionAmount?: number | null;
  ratePercent?: number | null;
  inseeCommuneCode?: string | null;
  sourcePayrollCodes: string[];
  mappingVersion: string;
  /** Montant réellement dû, signé, issu du journal de paie (distinct de .23.005). */
  payableAmount: number;
};

export type DsnOpsPayment = {
  opsIdentifier: string;
  amount: number;
  paymentModeCode: string;
  paymentDate?: Date | null;
  payerSiret?: string | null;
  iban?: string | null;
  bic?: string | null;
};

export type DsnAssessedBase = {
  employeeNir: string;
  code: string;
  amount: number;
  periodStart?: Date;
  periodEnd?: Date;
  components?: Array<{ code: string; amount: number }>;
};

export type DsnP26CompleteInput = DsnP26MonthlyInput & {
  assessedBases: DsnAssessedBase[];
  contributionBordereau: {
    opsIdentifier: string;
    totalAmount: number;
    individualContributions: DsnIndividualContribution[];
    aggregatedContributions: DsnAggregatedContribution[];
  };
  payments: DsnOpsPayment[];
};

type ParsedLine = { code: string; value: string };

function parseBaseFile(file: string): ParsedLine[] {
  return file
    .split(/\r?\n/)
    .filter(Boolean)
    .map((row) => {
      const match = row.match(/^([A-Z0-9.]+),'(.*)'$/);
      if (!match) throw new Error(`DSN bloquée : ligne impossible à relire (${row.slice(0, 40)}).`);
      return { code: match[1], value: match[2] };
    });
}

function money(value: number): string {
  if (!Number.isFinite(value)) throw new Error("DSN bloquée : montant de cotisation invalide.");
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

function decimal(value: number): string {
  if (!Number.isFinite(value)) throw new Error("DSN bloquée : taux de cotisation invalide.");
  return (Math.round((value + Number.EPSILON) * 1000) / 1000).toFixed(3);
}

function dsnDate(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) throw new Error("DSN bloquée : date de paiement invalide.");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${d}${m}${date.getUTCFullYear()}`;
}

function monthBounds(year: number, month: number): { start: string; end: string } {
  return {
    start: dsnDate(new Date(Date.UTC(year, month - 1, 1))),
    end: dsnDate(new Date(Date.UTC(year, month, 0))),
  };
}

function add(rows: ParsedLine[], code: string, value: string | number | null | undefined): void {
  if (value === null || value === undefined || value === "") return;
  const rendered = String(value);
  if (/[\u0000-\u001f\u007f-\u009f]/.test(rendered) || /[^\u0020-\u00ff]/.test(rendered)) throw new Error(`DSN bloquée : valeur interdite dans ${code}.`);
  if (`${code},'${rendered}'`.length > 256) throw new Error(`DSN bloquée : la rubrique ${code} dépasse 256 caractères.`);
  rows.push({ code, value: rendered });
}

function assertMappingVersion(value: string, payrollCode: string): void {
  if (!value.trim()) throw new Error(`DSN bloquée : le mapping DSN de ${payrollCode} n'est pas versionné.`);
}

function assertContributionCode(value: string, label: string): string {
  const normalized = value.trim();
  if (!/^\d{3}$/.test(normalized)) throw new Error(`DSN bloquée : ${label} doit contenir 3 chiffres.`);
  return normalized;
}

function assertOps(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!normalized || normalized.length > 14 || !/^[A-Z0-9]+$/.test(normalized)) throw new Error("DSN bloquée : identifiant OPS invalide.");
  return normalized;
}

function serialize(rows: ParsedLine[]): string {
  const withoutTotals = rows.filter((row) => !row.code.startsWith("S90.G00.90."));
  withoutTotals.push({ code: "S90.G00.90.001", value: String(withoutTotals.length + 2) });
  withoutTotals.push({ code: "S90.G00.90.002", value: "1" });
  return `${withoutTotals.map((row) => `${row.code},'${row.value}'`).join("\r\n")}\r\n`;
}

/**
 * Complète le générateur P26V01 avec les blocs de versement, bordereau,
 * cotisations agrégées et cotisations individuelles.
 *
 * Les codes CTP / cotisations individuelles ne sont jamais déduits du libellé
 * d'une cotisation : ils doivent provenir d'un mapping DSN validé et versionné.
 */
export function buildDsnP26V01Complete(input: DsnP26CompleteInput): string {
  const baseRows = parseBaseFile(buildDsnP26V01Monthly(input)).filter((row) => !row.code.startsWith("S21.G00.78."));
  const { start, end } = monthBounds(input.period.year, input.period.month);
  const ops = assertOps(input.contributionBordereau.opsIdentifier);
  if (!Number.isFinite(input.contributionBordereau.totalAmount) || input.contributionBordereau.totalAmount < 0) throw new Error("DSN bloquée : total du bordereau invalide.");
  if (input.contributionBordereau.aggregatedContributions.length === 0) throw new Error("DSN bloquée : aucun mapping de cotisation agrégée n'est disponible.");
  if (input.assessedBases.length === 0) throw new Error("DSN bloquée : aucune base assujettie mappée n’est disponible.");
  if (input.contributionBordereau.individualContributions.length === 0) throw new Error("DSN bloquée : aucun mapping de cotisation individuelle n'est disponible.");
  const cents = (amount: number): number => {
    if (!Number.isFinite(amount)) throw new Error("DSN bloquée : montant de rapprochement financier absent ou invalide.");
    return Math.round(amount * 100);
  };
  const assessedTotal = input.contributionBordereau.aggregatedContributions.reduce((sum, aggregate) => sum + cents(aggregate.payableAmount), 0);
  if (assessedTotal !== cents(input.contributionBordereau.totalAmount)) throw new Error("DSN bloquée : le total du bordereau ne correspond pas aux cotisations et réductions du journal de paie.");
  const paidTotal = input.payments.filter((payment) => assertOps(payment.opsIdentifier) === ops).reduce((sum, payment) => sum + cents(payment.amount), 0);
  if (paidTotal !== assessedTotal) throw new Error("DSN bloquée : le paiement Urssaf ne correspond pas au bordereau. Les acomptes, crédits et paiements différés nécessitent un rapprochement distinct avant export.");
  const aggregateKeys = new Set<string>();
  for (const aggregate of input.contributionBordereau.aggregatedContributions) {
    const key = [aggregate.code, aggregate.baseQualifier, aggregate.ratePercent ?? "", aggregate.inseeCommuneCode ?? ""].join("/");
    if (aggregateKeys.has(key)) throw new Error("DSN bloquée : un CTP est déclaré deux fois avec les mêmes qualifiant, taux et commune.");
    aggregateKeys.add(key);
  }

  const establishmentIndex = baseRows.findIndex((row) => row.code === "S21.G00.11.022");
  if (establishmentIndex < 0) throw new Error("DSN bloquée : bloc établissement introuvable.");

  const establishmentBlocks: ParsedLine[] = [];
  for (const payment of input.payments) {
    if (!Number.isFinite(payment.amount) || payment.amount < 0) throw new Error("DSN bloquée : montant de paiement OPS invalide.");
    add(establishmentBlocks, "S21.G00.20.001", assertOps(payment.opsIdentifier));
    add(establishmentBlocks, "S21.G00.20.003", payment.bic?.trim() || null);
    add(establishmentBlocks, "S21.G00.20.004", payment.iban?.replace(/\s+/g, "") || null);
    add(establishmentBlocks, "S21.G00.20.005", money(payment.amount));
    add(establishmentBlocks, "S21.G00.20.006", start);
    add(establishmentBlocks, "S21.G00.20.007", end);
    add(establishmentBlocks, "S21.G00.20.010", payment.paymentModeCode.trim());
    add(establishmentBlocks, "S21.G00.20.011", payment.paymentDate ? dsnDate(payment.paymentDate) : null);
    add(establishmentBlocks, "S21.G00.20.012", payment.payerSiret?.replace(/\s+/g, "") || null);
  }

  add(establishmentBlocks, "S21.G00.22.001", ops);
  add(establishmentBlocks, "S21.G00.22.003", start);
  add(establishmentBlocks, "S21.G00.22.004", end);
  add(establishmentBlocks, "S21.G00.22.005", money(input.contributionBordereau.totalAmount));

  for (const aggregate of input.contributionBordereau.aggregatedContributions) {
    assertMappingVersion(aggregate.mappingVersion, aggregate.sourcePayrollCodes.join(","));
    if (!aggregate.sourcePayrollCodes.length) throw new Error("DSN bloquée : cotisation agrégée sans rubrique de paie source.");
    assertUrssafAggregateMapping(aggregate);
    add(establishmentBlocks, "S21.G00.23.001", assertContributionCode(aggregate.code, "le code de cotisation agrégée"));
    add(establishmentBlocks, "S21.G00.23.002", aggregate.baseQualifier.trim());
    add(establishmentBlocks, "S21.G00.23.003", aggregate.ratePercent === null || aggregate.ratePercent === undefined ? null : money(aggregate.ratePercent));
    add(establishmentBlocks, "S21.G00.23.004", aggregate.baseAmount === null || aggregate.baseAmount === undefined ? null : money(aggregate.baseAmount));
    add(establishmentBlocks, "S21.G00.23.005", aggregate.contributionAmount === null || aggregate.contributionAmount === undefined ? null : money(aggregate.contributionAmount));
    add(establishmentBlocks, "S21.G00.23.006", aggregate.inseeCommuneCode?.trim() || null);
  }

  baseRows.splice(establishmentIndex + 1, 0, ...establishmentBlocks);

  const employeeNirs = input.employees.map((employee) => employee.nir.replace(/\s+/g, ""));
  const knownEmployees = new Set(employeeNirs);
  if (knownEmployees.size !== employeeNirs.length) throw new Error("DSN bloquée : un salarié est déclaré plusieurs fois.");
  if ([...input.assessedBases, ...input.contributionBordereau.individualContributions].some((item) => !knownEmployees.has(item.employeeNir.replace(/\s+/g, "")))) throw new Error("DSN bloquée : une base ou cotisation appartient à un salarié absent de la déclaration.");
  for (const employeeNir of employeeNirs) {
    const indexes = baseRows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.code === "S21.G00.30.001" && row.value === employeeNir)
      .map(({ index }) => index);
    if (indexes.length !== 1) throw new Error("DSN bloquée : impossible d'identifier de façon unique le bloc d'un salarié.");
    const employeeStart = indexes[0];
    let insertAt = baseRows.length;
    for (let index = employeeStart + 1; index < baseRows.length; index += 1) {
      if (baseRows[index].code === "S21.G00.30.001" || baseRows[index].code.startsWith("S21.G00.86.") || baseRows[index].code.startsWith("S90.G00.90.")) {
        insertAt = index;
        break;
      }
    }

    const individualBlocks: ParsedLine[] = [];
    const contributions = input.contributionBordereau.individualContributions.filter((item) => item.employeeNir.replace(/\s+/g, "") === employeeNir);
    if (contributions.length === 0) throw new Error("DSN bloquée : aucune cotisation individuelle mappée pour un salarié.");
    const bases = input.assessedBases.filter((base) => base.employeeNir.replace(/\s+/g, "") === employeeNir);
    if (bases.length === 0) throw new Error("DSN bloquée : bases assujetties absentes pour un salarié.");
    const baseCodes = new Set(bases.map((base) => base.code));
    if (baseCodes.size !== bases.length) throw new Error("DSN bloquée : une base assujettie est déclarée plusieurs fois pour le salarié.");
    for (const contribution of contributions) {
      if (!baseCodes.has(contribution.baseCode)) throw new Error(`DSN bloquée : la cotisation ${contribution.code} n'a pas de base assujettie parente.`);
    }
    for (const base of bases) {
      if (!/^\d{2}$/.test(base.code)) throw new Error("DSN bloquée : le code de base assujettie doit contenir deux chiffres.");
      add(individualBlocks, "S21.G00.78.001", base.code);
      add(individualBlocks, "S21.G00.78.002", base.periodStart ? dsnDate(base.periodStart) : start);
      add(individualBlocks, "S21.G00.78.003", base.periodEnd ? dsnDate(base.periodEnd) : end);
      add(individualBlocks, "S21.G00.78.004", money(base.amount));
      for (const component of base.components ?? []) {
        if (!/^\d{2}$/.test(component.code)) throw new Error("DSN bloquée : le code de composant de base est invalide.");
        add(individualBlocks, "S21.G00.79.001", component.code);
        add(individualBlocks, "S21.G00.79.004", money(component.amount));
      }
      for (const contribution of contributions.filter((item) => item.baseCode === base.code)) {
        assertMappingVersion(contribution.mappingVersion, contribution.sourcePayrollCode);
        if (!contribution.sourcePayrollCode.trim()) throw new Error("DSN bloquée : cotisation individuelle sans rubrique de paie source.");
        if (contribution.opsIdentifier !== null && assertOps(contribution.opsIdentifier) === ops && !["142", "146"].includes(contribution.code)) assertUrssafIndividualMapping(contribution, input.contributionBordereau.aggregatedContributions);
        if (["018", "106"].includes(contribution.code) && (base.code !== "03" || !base.components?.some((component) => component.code === "01"))) throw new Error("DSN bloquée : la réduction générale exige la base déplafonnée et son composant SMIC.");
        add(individualBlocks, "S21.G00.81.001", assertContributionCode(contribution.code, "le code de cotisation individuelle"));
        if (["131", "132", "106"].includes(contribution.code) && contribution.opsIdentifier !== null) throw new Error("DSN bloquée : l’identifiant OPS est interdit pour cette cotisation retraite.");
        add(individualBlocks, "S21.G00.81.002", contribution.opsIdentifier === null ? null : assertOps(contribution.opsIdentifier));
        add(individualBlocks, "S21.G00.81.003", contribution.baseAmount === null || contribution.baseAmount === undefined ? null : money(contribution.baseAmount));
        add(individualBlocks, "S21.G00.81.004", contribution.contributionAmount === null || contribution.contributionAmount === undefined ? null : money(contribution.contributionAmount));
        add(individualBlocks, "S21.G00.81.005", contribution.inseeCommuneCode?.trim() || null);
        add(individualBlocks, "S21.G00.81.007", contribution.ratePercent === null || contribution.ratePercent === undefined ? null : decimal(contribution.ratePercent));
      }
    }
    baseRows.splice(insertAt, 0, ...individualBlocks);
  }

  return serialize(baseRows);
}
