import { buildDsnP26V01Monthly, type DsnP26MonthlyInput } from "./dsn-p26v01";

export type DsnIndividualContribution = {
  employeeNir: string;
  code: string;
  opsIdentifier: string;
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

export type DsnP26CompleteInput = DsnP26MonthlyInput & {
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
  return (Math.round((value + Number.EPSILON) * 10000) / 10000).toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
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
  if (/[\r\n\0']/.test(rendered)) throw new Error(`DSN bloquée : valeur interdite dans ${code}.`);
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
  const baseRows = parseBaseFile(buildDsnP26V01Monthly(input));
  const { start, end } = monthBounds(input.period.year, input.period.month);
  const ops = assertOps(input.contributionBordereau.opsIdentifier);
  if (!Number.isFinite(input.contributionBordereau.totalAmount) || input.contributionBordereau.totalAmount < 0) throw new Error("DSN bloquée : total du bordereau invalide.");
  if (input.contributionBordereau.aggregatedContributions.length === 0) throw new Error("DSN bloquée : aucun mapping de cotisation agrégée n'est disponible.");
  if (input.contributionBordereau.individualContributions.length === 0) throw new Error("DSN bloquée : aucun mapping de cotisation individuelle n'est disponible.");

  const establishmentIndex = baseRows.findIndex((row) => row.code === "S21.G00.11.022");
  if (establishmentIndex < 0) throw new Error("DSN bloquée : bloc établissement introuvable.");

  const establishmentBlocks: ParsedLine[] = [];
  for (const payment of input.payments) {
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
    add(establishmentBlocks, "S21.G00.23.001", assertContributionCode(aggregate.code, "le code de cotisation agrégée"));
    add(establishmentBlocks, "S21.G00.23.002", aggregate.baseQualifier.trim());
    add(establishmentBlocks, "S21.G00.23.003", aggregate.ratePercent === null || aggregate.ratePercent === undefined ? null : decimal(aggregate.ratePercent));
    add(establishmentBlocks, "S21.G00.23.004", aggregate.baseAmount === null || aggregate.baseAmount === undefined ? null : money(aggregate.baseAmount));
    add(establishmentBlocks, "S21.G00.23.005", aggregate.contributionAmount === null || aggregate.contributionAmount === undefined ? null : money(aggregate.contributionAmount));
    add(establishmentBlocks, "S21.G00.23.006", aggregate.inseeCommuneCode?.trim() || null);
  }

  baseRows.splice(establishmentIndex + 1, 0, ...establishmentBlocks);

  const employeeNirs = input.employees.map((employee) => employee.nir.replace(/\s+/g, ""));
  for (const employeeNir of employeeNirs) {
    const indexes = baseRows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.code === "S21.G00.30.001" && row.value === employeeNir)
      .map(({ index }) => index);
    if (indexes.length !== 1) throw new Error(`DSN bloquée : impossible d'identifier de façon unique le bloc du salarié ${employeeNir}.`);
    const employeeStart = indexes[0];
    let insertAt = baseRows.length;
    for (let index = employeeStart + 1; index < baseRows.length; index += 1) {
      if (baseRows[index].code === "S21.G00.30.001" || baseRows[index].code.startsWith("S90.G00.90.")) {
        insertAt = index;
        break;
      }
    }

    const individualBlocks: ParsedLine[] = [];
    const contributions = input.contributionBordereau.individualContributions.filter((item) => item.employeeNir.replace(/\s+/g, "") === employeeNir);
    if (contributions.length === 0) throw new Error(`DSN bloquée : aucune cotisation individuelle mappée pour le salarié ${employeeNir}.`);
    for (const contribution of contributions) {
      assertMappingVersion(contribution.mappingVersion, contribution.sourcePayrollCode);
      add(individualBlocks, "S21.G00.81.001", assertContributionCode(contribution.code, "le code de cotisation individuelle"));
      add(individualBlocks, "S21.G00.81.002", assertOps(contribution.opsIdentifier));
      add(individualBlocks, "S21.G00.81.003", contribution.baseAmount === null || contribution.baseAmount === undefined ? null : money(contribution.baseAmount));
      add(individualBlocks, "S21.G00.81.004", contribution.contributionAmount === null || contribution.contributionAmount === undefined ? null : money(contribution.contributionAmount));
      add(individualBlocks, "S21.G00.81.005", contribution.inseeCommuneCode?.trim() || null);
      add(individualBlocks, "S21.G00.81.007", contribution.ratePercent === null || contribution.ratePercent === undefined ? null : decimal(contribution.ratePercent));
    }
    baseRows.splice(insertAt, 0, ...individualBlocks);
  }

  return serialize(baseRows);
}
