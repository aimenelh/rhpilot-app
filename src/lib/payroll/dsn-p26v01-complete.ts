import { buildDsnP26V01Monthly, type DsnP26MonthlyInput } from "./dsn-p26v01";
import { assertUrssafAggregateMapping, assertUrssafIndividualMapping } from "./dsn-urssaf-mapping";

export type DsnIndividualContribution = {
  employeeNir: string;
  code: string;
  /** Base S21.G00.78 parente (02 plafonnée, 03 déplafonnée, 04 CSG...). */
  baseCode: string;
  affiliationId?: string;
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
  delegateCode?: string | null;
  components?: Array<{ amount: number; contractReference: string; period: string }>;
};

export type DsnAssessedBase = {
  employeeNir: string;
  code: string;
  amount: number;
  affiliationId?: string;
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
  expectedLiabilities?: Array<{ opsIdentifier: string; amount: number }>;
  complementaryAdhesions?: Array<{ id: string; organismCode: string; contractReference: string; delegateCode: string | null }>;
  complementaryAffiliations?: Array<{ employeeNir: string; id: string; adhesionId: string; populationCode: string | null; optionCode: string | null; validFrom: Date; validUntil: Date | null }>;
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
  if (!value.trim()) throw new Error(`DSN bloquée : la correspondance DSN de ${payrollCode} n’est pas versionnée.`);
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
  if (input.contributionBordereau.aggregatedContributions.length === 0) throw new Error("DSN bloquée : aucune correspondance de cotisation agrégée n’est disponible.");
  if (input.assessedBases.length === 0) throw new Error("DSN bloquée : aucune base assujettie n’est disponible.");
  if (input.contributionBordereau.individualContributions.length === 0) throw new Error("DSN bloquée : aucune correspondance de cotisation individuelle n’est disponible.");
  const cents = (amount: number): number => {
    if (!Number.isFinite(amount)) throw new Error("DSN bloquée : montant de rapprochement financier absent ou invalide.");
    return Math.round(amount * 100);
  };
  const assessedTotal = input.contributionBordereau.aggregatedContributions.reduce((sum, aggregate) => sum + cents(aggregate.payableAmount), 0);
  if (assessedTotal !== cents(input.contributionBordereau.totalAmount)) throw new Error("DSN bloquée : le total du bordereau ne correspond pas aux cotisations et réductions du journal de paie.");
  const paidTotal = input.payments.filter((payment) => assertOps(payment.opsIdentifier) === ops).reduce((sum, payment) => sum + cents(payment.amount), 0);
  if (paidTotal !== assessedTotal) throw new Error("DSN bloquée : le paiement Urssaf ne correspond pas au bordereau. Les acomptes, crédits et paiements différés nécessitent un rapprochement distinct avant export.");
  if (input.expectedLiabilities) {
    const expected = new Map(input.expectedLiabilities.map((item) => [assertOps(item.opsIdentifier), cents(item.amount)]));
    if (expected.size !== input.expectedLiabilities.length) throw new Error("DSN bloquée : dette organisme dupliquée.");
    const declared = new Map<string, number>();
    for (const payment of input.payments) declared.set(assertOps(payment.opsIdentifier), (declared.get(assertOps(payment.opsIdentifier)) ?? 0) + cents(payment.amount));
    if (declared.size !== expected.size || [...expected].some(([id, amount]) => declared.get(id) !== amount)) throw new Error("DSN bloquée : les paiements ne correspondent pas aux dettes de tous les organismes.");
  }
  const aggregateKeys = new Set<string>();
  for (const aggregate of input.contributionBordereau.aggregatedContributions) {
    const key = [aggregate.code, aggregate.baseQualifier, aggregate.ratePercent ?? "", aggregate.inseeCommuneCode ?? ""].join("/");
    if (aggregateKeys.has(key)) throw new Error("DSN bloquée : un CTP est déclaré deux fois avec les mêmes qualifiant, taux et commune.");
    aggregateKeys.add(key);
  }

  const establishmentIndex = baseRows.findIndex((row) => row.code === "S21.G00.11.022");
  if (establishmentIndex < 0) throw new Error("DSN bloquée : bloc établissement introuvable.");

  const establishmentBlocks: ParsedLine[] = [];
  const adhesions = input.complementaryAdhesions ?? [];
  const affiliationRows = input.complementaryAffiliations ?? [];
  if (new Set(adhesions.map((item) => item.id)).size !== adhesions.length) throw new Error("DSN bloquée : identifiant d'adhésion complémentaire dupliqué.");
  for (const adhesion of adhesions) {
    if (!affiliationRows.some((affiliation) => affiliation.adhesionId === adhesion.id)) throw new Error("DSN bloquée : une adhésion est déclarée couverte sans salarié affilié.");
    if (!/^[1-9]\d{0,2}$/.test(adhesion.id)) throw new Error("DSN bloquée : identifiant technique d'adhésion invalide.");
    add(establishmentBlocks, "S21.G00.15.001", adhesion.contractReference);
    add(establishmentBlocks, "S21.G00.15.002", adhesion.organismCode);
    add(establishmentBlocks, "S21.G00.15.003", adhesion.delegateCode);
    add(establishmentBlocks, "S21.G00.15.004", "01");
    add(establishmentBlocks, "S21.G00.15.005", adhesion.id);
  }
  for (const payment of input.payments) {
    if (!Number.isFinite(payment.amount) || payment.amount < 0) throw new Error("DSN bloquée : montant de paiement OPS invalide.");
    add(establishmentBlocks, "S21.G00.20.001", assertOps(payment.opsIdentifier));
    add(establishmentBlocks, "S21.G00.20.002", assertOps(payment.opsIdentifier) === "DGFIP" ? "DGFIP_PAS" : null);
    add(establishmentBlocks, "S21.G00.20.003", payment.bic?.trim() || null);
    add(establishmentBlocks, "S21.G00.20.004", payment.iban?.replace(/\s+/g, "") || null);
    add(establishmentBlocks, "S21.G00.20.005", money(payment.amount));
    add(establishmentBlocks, "S21.G00.20.006", payment.components ? "01012000" : start);
    add(establishmentBlocks, "S21.G00.20.007", payment.components ? "01012000" : end);
    add(establishmentBlocks, "S21.G00.20.008", payment.delegateCode);
    add(establishmentBlocks, "S21.G00.20.010", payment.paymentModeCode.trim());
    add(establishmentBlocks, "S21.G00.20.011", payment.paymentDate ? dsnDate(payment.paymentDate) : null);
    add(establishmentBlocks, "S21.G00.20.012", payment.payerSiret?.replace(/\s+/g, "") || null);
    if (payment.components) {
      if (payment.components.reduce((total, component) => total + cents(component.amount), 0) !== cents(payment.amount)) throw new Error("DSN bloquée : les composants de paiement complémentaire divergent du total.");
      for (const component of payment.components) {
        if (!adhesions.some((adhesion) => adhesion.organismCode === payment.opsIdentifier && adhesion.delegateCode === (payment.delegateCode ?? null) && adhesion.contractReference === component.contractReference)) throw new Error("DSN bloquée : un paiement complémentaire ne correspond à aucune adhésion.");
        add(establishmentBlocks, "S21.G00.55.001", money(component.amount));
        add(establishmentBlocks, "S21.G00.55.003", component.contractReference);
        add(establishmentBlocks, "S21.G00.55.004", component.period);
      }
    }
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
  if (affiliationRows.some((item) => !knownEmployees.has(item.employeeNir))) throw new Error("DSN bloquée : une affiliation appartient à un salarié absent du fichier.");
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

    const employeeAffiliations = affiliationRows.filter((item) => item.employeeNir === employeeNir);
    if (new Set(employeeAffiliations.map((item) => item.id)).size !== employeeAffiliations.length) throw new Error("DSN bloquée : affiliation complémentaire dupliquée.");
    const affiliationBlocks: ParsedLine[] = [];
    for (const affiliation of employeeAffiliations) {
      if (!/^[1-9]\d{0,2}$/.test(affiliation.id) || !adhesions.some((item) => item.id === affiliation.adhesionId)) throw new Error("DSN bloquée : affiliation complémentaire sans adhésion valide.");
      add(affiliationBlocks, "S21.G00.70.004", affiliation.optionCode);
      add(affiliationBlocks, "S21.G00.70.005", affiliation.populationCode);
      add(affiliationBlocks, "S21.G00.70.012", affiliation.id);
      add(affiliationBlocks, "S21.G00.70.013", affiliation.adhesionId);
      add(affiliationBlocks, "S21.G00.70.014", dsnDate(affiliation.validFrom));
      add(affiliationBlocks, "S21.G00.70.015", affiliation.validUntil ? dsnDate(affiliation.validUntil) : null);
    }
    const paymentIndex = baseRows.findIndex((row, index) => index > employeeStart && row.code.startsWith("S21.G00.71."));
    if (paymentIndex < 0 || paymentIndex >= insertAt) throw new Error("DSN bloquée : versement du salarié introuvable pour rattacher les affiliations.");
    baseRows.splice(paymentIndex, 0, ...affiliationBlocks);
    insertAt += affiliationBlocks.length;
    const individualBlocks: ParsedLine[] = [];
    const contributions = input.contributionBordereau.individualContributions.filter((item) => item.employeeNir.replace(/\s+/g, "") === employeeNir);
    if (contributions.length === 0) throw new Error("DSN bloquée : aucune cotisation individuelle n’est rattachée à un salarié.");
    const bases = input.assessedBases.filter((base) => base.employeeNir.replace(/\s+/g, "") === employeeNir);
    if (bases.length === 0) throw new Error("DSN bloquée : bases assujetties absentes pour un salarié.");
    if (employeeAffiliations.some((affiliation) => !bases.some((base) => base.code === "31" && base.affiliationId === affiliation.id))) throw new Error("DSN bloquée : une affiliation complémentaire n’a pas de base assujettie.");
    const baseKey = (code: string, id?: string): string => `${code}/${id ?? ""}`;
    const baseCodes = new Set(bases.map((base) => baseKey(base.code, base.affiliationId)));
    if (baseCodes.size !== bases.length) throw new Error("DSN bloquée : une base assujettie est déclarée plusieurs fois pour le salarié.");
    for (const contribution of contributions) {
      if (!baseCodes.has(baseKey(contribution.baseCode, contribution.affiliationId))) throw new Error(`DSN bloquée : la cotisation ${contribution.code} n'a pas de base assujettie parente.`);
    }
    for (const base of bases) {
      if (!/^\d{2}$/.test(base.code)) throw new Error("DSN bloquée : le code de base assujettie doit contenir deux chiffres.");
      if (base.code === "31") {
        if (cents(base.amount) !== 0 || !employeeAffiliations.some((item) => item.id === base.affiliationId) || !(base.components?.length)) throw new Error("DSN bloquée : la base complémentaire doit être nulle, affiliée et détaillée.");
        const attached = contributions.filter((item) => item.baseCode === "31" && item.affiliationId === base.affiliationId);
        if (attached.length !== 1 || attached[0].code !== "059" || attached[0].opsIdentifier !== null || attached[0].baseAmount != null || attached[0].ratePercent != null) throw new Error("DSN bloquée : chaque affiliation exige une seule cotisation 059 sans OPS, taux ni assiette individuelle.");
        if (base.components.some((item) => !/^(1[0-9]|20|21|23|24)$/.test(item.code)) || new Set(base.components.map((item) => item.code)).size !== base.components.length) throw new Error("DSN bloquée : les composants de base complémentaire sont invalides ou dupliqués.");
      } else if (base.affiliationId) throw new Error("DSN bloquée : une affiliation est interdite sur cette base.");
      add(individualBlocks, "S21.G00.78.001", base.code);
      add(individualBlocks, "S21.G00.78.002", base.periodStart ? dsnDate(base.periodStart) : start);
      add(individualBlocks, "S21.G00.78.003", base.periodEnd ? dsnDate(base.periodEnd) : end);
      add(individualBlocks, "S21.G00.78.004", money(base.amount));
      add(individualBlocks, "S21.G00.78.005", base.affiliationId);
      for (const component of base.components ?? []) {
        if (!/^\d{2}$/.test(component.code)) throw new Error("DSN bloquée : le code de composant de base est invalide.");
        add(individualBlocks, "S21.G00.79.001", component.code);
        add(individualBlocks, "S21.G00.79.004", money(component.amount));
      }
      for (const contribution of contributions.filter((item) => item.baseCode === base.code && item.affiliationId === base.affiliationId)) {
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
