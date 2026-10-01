import type { IdentifiedDsnAffiliation } from "./dsn-complementary-affiliations";
import type { PayslipInput, PayslipLine, PayslipResult } from "./bulletin/types";
import type { DsnAggregatedContribution, DsnAssessedBase, DsnIndividualContribution } from "./dsn-p26v01-complete";

export const LOCKED_CONTRIBUTION_MAPPING_VERSION = "P26V01-RG-2026.3";
export const LOCKED_CONTRIBUTION_SOURCES = [
  "https://open.urssaf.fr/explore/dataset/equivalence-dida/export/",
  "https://www.urssaf.fr/accueil/actualites/declaration-cotisation-am-af.html",
  "https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/reduction-generale-cotisation.html",
  "https://net-entreprises.custhelp.com/app/answers/detail_dsn/a_id/2556/",
  "https://net-entreprises.custhelp.com/app/answers/detail_dsn/a_id/2537/",
  "https://net-entreprises.custhelp.com/app/answers/detail/a_id/2066/",
  "https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/exonerations-heures/deduction-forfaitaire-patronale.html",
] as const;

type LockedSnapshot = { bulletin: PayslipResult; inputs: PayslipInput };
export type LockedContributionData = {
  bases: DsnAssessedBase[];
  individual: DsnIndividualContribution[];
  aggregates: DsnAggregatedContribution[];
  liabilities: Array<{ opsIdentifier: string; amount: number }>;
  deferred: Array<{ employeeNir: string; code: string; amount: number; declaration: string }>;
  atmpRatePercent: number;
  unemploymentBase: number;
  hoursPaid: number;
  grossSubject: number;
  overtime: LockedOvertimeDeclaration;
  complementaryAdhesions: NonNullable<import("./dsn-p26v01-complete").DsnP26CompleteInput["complementaryAdhesions"]>;
  complementaryAffiliations: NonNullable<import("./dsn-p26v01-complete").DsnP26CompleteInput["complementaryAffiliations"]>;
  complementaryPayments: Array<{ opsIdentifier: string; delegateCode: string | null; contractReference: string; amount: number; period: string }>;
};

const cents = (value: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("DSN bloquée : un montant du bulletin verrouillé est invalide.");
  return Math.round(value * 100);
};
const round = (value: number): number => cents(value) / 100;
const numeric = (value: unknown, label: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`DSN bloquée : ${label} du bulletin verrouillé manque ou est invalide.`);
  return value;
};
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));

export function readLockedContributionSnapshot(value: unknown): LockedSnapshot {
  if (!object(value) || !object(value.bulletin) || !object(value.inputs) ||
      !Array.isArray(value.bulletin.lines) || !object(value.bulletin.totals) ||
      !object(value.bulletin.yearToDate) || !object(value.bulletin.period) ||
      !object(value.bulletin.employee) || !object(value.inputs.organization) ||
      !object(value.inputs.employee) || !object(value.inputs.period) || !object(value.inputs.pay)) {
    throw new Error("DSN bloquée : le bulletin détaillé et ses entrées verrouillées sont nécessaires au mapping des cotisations.");
  }
  const result = value as unknown as LockedSnapshot;
  if (result.bulletin.period.year !== 2026 || result.inputs.period.year !== 2026 ||
      result.inputs.period.month !== result.bulletin.period.month ||
      result.inputs.employee.id !== result.bulletin.employee.id) {
    throw new Error("DSN bloquée : la période ou le salarié du bulletin et de ses entrées verrouillées divergent.");
  }
  return result;
}

export type LockedOvertimeDeclaration = {
  remunerations: Array<{ type: "017" | "018"; hours: number; amount: number }>;
  totalAmount: number;
  employerEligibleAmount: number;
  taxExemptGrossAmount: number;
  taxExemptNetAmount: number;
};

/**
 * Traduit uniquement les lignes d'heures du bulletin verrouillé.
 * 017 = HS/HC aléatoires ; 018 = heures supplémentaires structurelles.
 * Le net fiscal exonéré est dérivé des cumuls et des taux CSG figés dans le bulletin,
 * jamais d'un paramètre vivant relu au moment de préparer la DSN.
 */
export function readLockedOvertimeDeclaration(value: unknown): LockedOvertimeDeclaration {
  const { bulletin, inputs } = readLockedContributionSnapshot(value);
  const grossLines = bulletin.lines.filter((line) => line.section === "GROSS");
  const expected = [
    ["HS_STRUCT", inputs.pay.structuralOvertimeMonthlyHours ?? 0],
    ["HS_25", inputs.overtime?.hoursFirstBand ?? 0],
    ["HS_50", inputs.overtime?.hoursSecondBand ?? 0],
    ["HC_10", inputs.complementaryHours?.hoursWithinTenth ?? 0],
    ["HC_25", inputs.complementaryHours?.hoursBeyondTenth ?? 0],
  ] as const;

  const found = new Map<string, PayslipLine>();
  for (const [code, expectedHours] of expected) {
    const matches = grossLines.filter((line) => line.code === code);
    if (matches.length > 1) throw new Error(`DSN bloquée : la rubrique ${code} est dupliquée dans le bulletin verrouillé.`);
    const line = matches[0];
    if (expectedHours > 0) {
      if (!line) throw new Error(`DSN bloquée : la rémunération ${code} manque dans le bulletin verrouillé.`);
      const hours = numeric(line.quantity, `le volume ${code}`);
      const amount = numeric(line.amount, `le montant ${code}`);
      if (Math.abs(hours - expectedHours) > 0.01 || amount <= 0 || line.unit !== "HOURS") throw new Error(`DSN bloquée : la rémunération ${code} ne correspond pas aux heures verrouillées.`);
      found.set(code, line);
    } else if (line) {
      throw new Error(`DSN bloquée : la rémunération ${code} existe sans heures correspondantes dans les entrées verrouillées.`);
    }
  }

  const structural = found.get("HS_STRUCT");
  const random = ["HS_25", "HS_50", "HC_10", "HC_25"].map((code) => found.get(code)).filter((line): line is PayslipLine => Boolean(line));
  const structuralAmount = structural ? round(numeric(structural.amount, "le montant des heures structurelles")) : 0;
  const structuralHours = structural ? numeric(structural.quantity, "les heures structurelles") : 0;
  const randomAmount = round(random.reduce((total, line) => total + numeric(line.amount, line.code), 0));
  const randomHours = round(random.reduce((total, line) => total + numeric(line.quantity, line.code), 0));
  const totalAmount = round(structuralAmount + randomAmount);
  const employerEligibleAmount = round(["HS_STRUCT", "HS_25", "HS_50"].reduce((total, code) => total + (found.has(code) ? numeric(found.get(code)!.amount, code) : 0), 0));

  const previousExemptGross = numeric(inputs.yearToDate?.overtimeTaxExemptGross ?? 0, "le cumul antérieur d'heures défiscalisées");
  const currentExemptGross = numeric(bulletin.yearToDate.overtimeTaxExemptGross, "le cumul d'heures défiscalisées");
  const taxExemptGrossAmount = round(currentExemptGross - previousExemptGross);
  if (taxExemptGrossAmount < 0 || taxExemptGrossAmount > totalAmount + 0.01) throw new Error("DSN bloquée : le cumul fiscal des heures supplémentaires/complémentaires est incohérent avec le bulletin du mois.");

  let taxExemptNetAmount = 0;
  if (taxExemptGrossAmount > 0) {
    const overtimeCsg = bulletin.lines.find((line) => line.code === "CSG_NON_IMPOSABLE");
    const ordinaryCsg = bulletin.lines.find((line) => line.code === "CSG_DEDUCTIBLE");
    if (!overtimeCsg || !ordinaryCsg) throw new Error("DSN bloquée : les bases CSG verrouillées des heures défiscalisées sont absentes.");
    const overtimeCsgBase = numeric(overtimeCsg.base, "l'assiette CSG des heures défiscalisées");
    const deductibleCsgRate = numeric(ordinaryCsg.rate, "le taux de CSG déductible");
    if (overtimeCsgBase <= 0 || deductibleCsgRate <= 0) throw new Error("DSN bloquée : les paramètres CSG verrouillés des heures défiscalisées sont invalides.");
    taxExemptNetAmount = round(taxExemptGrossAmount - round(overtimeCsgBase * deductibleCsgRate));
    if (taxExemptNetAmount <= 0 || taxExemptNetAmount > taxExemptGrossAmount) throw new Error("DSN bloquée : le net fiscal des heures défiscalisées est incohérent.");
  }

  const remunerations: LockedOvertimeDeclaration["remunerations"] = [];
  if (structuralAmount > 0) remunerations.push({ type: "018", hours: structuralHours, amount: structuralAmount });
  if (randomAmount > 0) remunerations.push({ type: "017", hours: randomHours, amount: randomAmount });
  return { remunerations, totalAmount, employerEligibleAmount, taxExemptGrossAmount, taxExemptNetAmount };
}

/** Ventilation des cumuls, puis différence mensuelle : pas d'arrondi séparé chaque mois. */
export function splitLockedRgdu(current: unknown, previous?: unknown): { urssaf: number; retirement: number; smic: number } {
  const { bulletin, inputs } = readLockedContributionSnapshot(current);
  const cumulative = numeric(bulletin.yearToDate.rgduAmount, "le cumul RGDU");
  const priorTotal = numeric(inputs.yearToDate?.rgduAmount ?? 0, "le cumul RGDU antérieur");
  const headcount = numeric(inputs.organization.headcount, "l'effectif");
  if (headcount < 0 || cumulative < 0 || priorTotal < 0) throw new Error("DSN bloquée : les cumuls RGDU ou l'effectif sont négatifs.");
  const fraction = headcount >= 50 ? 0.3420 / 0.4021 : 0.3380 / 0.3981;
  let priorUrssaf = 0;
  if (priorTotal !== 0) {
    if (previous === undefined) throw new Error("DSN bloquée : la ventilation RGDU nécessite le bulletin antérieur verrouillé ; une reprise du seul cumul global est insuffisante.");
    const prior = readLockedContributionSnapshot(previous);
    if (prior.bulletin.employee.id !== bulletin.employee.id || prior.bulletin.period.month !== bulletin.period.month - 1 ||
        cents(numeric(prior.bulletin.yearToDate.rgduAmount, "le cumul RGDU du bulletin antérieur")) !== cents(priorTotal)) {
      throw new Error("DSN bloquée : le bulletin antérieur ne correspond pas au cumul RGDU repris.");
    }
    const priorHeadcount = numeric(prior.inputs.organization.headcount, "l'effectif antérieur");
    // Un passage de seuil en cours d'année exige son régime transitoire et une ventilation historique explicite.
    if ((priorHeadcount >= 50) !== (headcount >= 50)) throw new Error("DSN bloquée : changement de seuil FNAL/RGDU en cours d'année, à régulariser explicitement.");
    priorUrssaf = round(priorTotal * fraction);
  }
  const globalMonth = round(cumulative - priorTotal);
  const urssaf = round(round(cumulative * fraction) - priorUrssaf);
  const smic = round(numeric(bulletin.yearToDate.rgduSmic, "le cumul SMIC RGDU") - numeric(inputs.yearToDate?.rgduSmic ?? 0, "le cumul SMIC RGDU antérieur"));
  const line = bulletin.lines.find((item) => item.code === "RGDU");
  if (cents(line?.employerAmount ?? 0) !== -cents(globalMonth)) throw new Error("DSN bloquée : la réduction RGDU du bulletin ne correspond pas à ses cumuls.");
  if (smic < 0) throw new Error("DSN bloquée : le composant SMIC RGDU courant est négatif.");
  return { urssaf: -urssaf, retirement: -round(globalMonth - urssaf), smic };
}

/** Mapping initial du régime général : tout élément sans traduction explicite bloque. */
export function mapLockedContributions(input: {
  snapshot: unknown;
  previousSnapshot?: unknown;
  employeeNir: string;
  urssafSiret: string;
  retirementOps: string;
  complementaryAffiliations?: IdentifiedDsnAffiliation[];
}): LockedContributionData {
  const { bulletin, inputs } = readLockedContributionSnapshot(input.snapshot);
  if (!/^\d{14}$/.test(input.urssafSiret) || !/^\d{14}$/.test(input.retirementOps)) throw new Error("DSN bloquée : les organismes Urssaf et retraite doivent être renseignés depuis les notifications d'affiliation.");
  if (inputs.employee.contract === "APPRENTISSAGE") throw new Error("DSN bloquée : les exonérations sociales spécifiques des apprentis nécessitent encore leur mapping déclaratif.");
  if (inputs.organization.territory !== "METROPOLE" || inputs.organization.alsaceMoselle) throw new Error("DSN bloquée : le mapping social actuel couvre la métropole hors régime local Alsace-Moselle.");
  if ([inputs.absences, inputs.bonuses, inputs.benefitsInKind, inputs.expenses, inputs.netAdjustments].some((items) => (items?.length ?? 0) > 0) || inputs.termination || inputs.mealVouchers || inputs.publicTransport) throw new Error("DSN bloquée : les événements et autres revenus du bulletin nécessitent leurs blocs déclaratifs spécifiques.");
  const journal = bulletin.lines.filter((line) => line.section !== "GROSS" && line.section !== "NET_ITEMS");
  if (journal.some((line) => !line || !line.code || !line.section)) throw new Error("DSN bloquée : une rubrique du journal de cotisations est invalide.");
  if (new Set(journal.map((line) => line.code)).size !== journal.length) throw new Error("DSN bloquée : une rubrique de cotisation est dupliquée dans le bulletin.");
  const sum = (lines: readonly PayslipLine[], side: "amount" | "employerAmount"): number => round(lines.reduce((total, line) => total + numeric(line[side] ?? 0, line.code), 0));
  if (cents(sum(journal, "amount")) !== cents(numeric(bulletin.totals.employeeContributions, "les cotisations salariales")) ||
      cents(sum(journal, "employerAmount")) !== cents(numeric(bulletin.totals.employerContributions, "les cotisations patronales"))) {
    throw new Error("DSN bloquée : le détail des cotisations ne correspond pas aux totaux du bulletin verrouillé.");
  }
  const byCode = new Map(journal.map((line) => [line.code, line]));
  const overtime = readLockedOvertimeDeclaration(input.snapshot);
  const line = (code: string): PayslipLine => {
    const found = byCode.get(code);
    if (!found) throw new Error(`DSN bloquée : la cotisation ${code} manque dans le bulletin verrouillé.`);
    return found;
  };
  const base = (code: string): number => numeric(line(code).base, `l'assiette ${code}`);
  const amount = (code: string): number => round(numeric(line(code).amount ?? 0, code) + numeric(line(code).employerAmount ?? 0, code));
  const mapped = new Set<string>();
  const individual: DsnIndividualContribution[] = [];
  const aggregates = new Map<string, DsnAggregatedContribution>();
  const liabilities = new Map<string, number>();
  const deferred: LockedContributionData["deferred"] = [];
  const complementaryAdhesions: LockedContributionData["complementaryAdhesions"] = [];
  const complementaryAffiliations: LockedContributionData["complementaryAffiliations"] = [];
  const complementaryPayments: LockedContributionData["complementaryPayments"] = [];
  const bases: DsnAssessedBase[] = [];
  const addBase = (code: string, value: number, components?: DsnAssessedBase["components"]): void => { bases.push({ employeeNir: input.employeeNir, code, amount: round(value), ...(components ? { components } : {}) }); };
  const addIndividual = (code: string, baseCode: string, opsIdentifier: string | null, value: number, sources: string[], ratePercent?: number, baseAmount?: number, inseeCommuneCode?: string): void => {
    individual.push({ employeeNir: input.employeeNir, code, baseCode, opsIdentifier, contributionAmount: round(value), sourcePayrollCode: sources.join("+"), mappingVersion: LOCKED_CONTRIBUTION_MAPPING_VERSION, ...(ratePercent === undefined ? {} : { ratePercent }), ...(baseAmount === undefined ? {} : { baseAmount }), ...(inseeCommuneCode ? { inseeCommuneCode } : {}) });
  };
  const addAggregate = (ctp: string, qualifier: string, value: number, sources: string[], fields: Partial<DsnAggregatedContribution>): void => {
    const key = `${ctp}/${qualifier}`;
    const old = aggregates.get(key);
    if (!old) aggregates.set(key, { code: ctp, baseQualifier: qualifier, payableAmount: round(value), sourcePayrollCodes: sources, mappingVersion: LOCKED_CONTRIBUTION_MAPPING_VERSION, ...fields });
    else {
      old.payableAmount = round(old.payableAmount + value);
      old.sourcePayrollCodes = [...new Set([...old.sourcePayrollCodes, ...sources])];
    }
    liabilities.set(input.urssafSiret, round((liabilities.get(input.urssafSiret) ?? 0) + value));
  };
  const g = numeric(bulletin.totals.grossSubject, "le brut soumis");
  const t1 = base("VIEILLESSE_PLAF");
  const unemploymentBase = base("CHOMAGE");
  const rgdu = splitLockedRgdu(input.snapshot, input.previousSnapshot);
  addBase("02", t1);
  addBase("03", g, [{ code: "01", amount: rgdu.smic }]);
  addBase("07", unemploymentBase);
  const ordinary = [
    ["ATMP", "045", "03", "100", "920"], ["CSA", "068", "03", "100", "920"],
    ["VIEILLESSE_DEPLAF", "076", "03", "100", "920"], ["VIEILLESSE_PLAF", "076", "02", "100", "921"],
    ["CHOMAGE", "040", "07", "772", "920"], ["AGS", "048", "07", "937", "920"],
    ["DIALOGUE_SOCIAL", "100", "03", "027", "920"],
  ] as const;
  const atmpRatePercent = numeric(line("ATMP").employerRate, "le taux AT/MP") * 100;
  for (const [source, code, parent, ctp, qualifier] of ordinary) {
    const b = base(source);
    if (cents(b) !== cents(parent === "02" ? t1 : parent === "07" ? unemploymentBase : g)) throw new Error(`DSN bloquée : l'assiette ${source} diverge de sa base assujettie.`);
    const rate = numeric(line(source).rate ?? 0, source) + numeric(line(source).employerRate ?? 0, source);
    addIndividual(code, parent, input.urssafSiret, amount(source), [source], rate * 100, b);
    addAggregate(ctp, qualifier, amount(source), [source], { baseAmount: b, ...(ctp === "100" && qualifier === "920" ? { ratePercent: atmpRatePercent } : {}) });
    mapped.add(source);
  }
  for (const [source, normalCode, extraCode, ctp, normalRate] of [
    ["MALADIE", "075", "907", "635", 0.07], ["FAMILLE", "074", "102", "430", 0.0345],
  ] as const) {
    const b = base(source);
    if (cents(b) !== cents(g)) throw new Error(`DSN bloquée : l'assiette ${source} diverge du brut soumis.`);
    const fullRate = numeric(line(source).employerRate, source);
    if (Math.abs(fullRate - (source === "MALADIE" ? 0.13 : 0.0525)) > 1e-8) throw new Error("DSN bloquée : un taux maladie/famille spécifique nécessite un mapping distinct.");
    const regular = round(b * normalRate);
    const extra = round(amount(source) - regular);
    addIndividual(normalCode, "03", input.urssafSiret, regular, [source], normalRate * 100, b);
    addIndividual(extraCode, "03", input.urssafSiret, extra, [source], (fullRate - normalRate) * 100, b);
    addAggregate("100", "920", regular, [source], { baseAmount: b, ratePercent: atmpRatePercent });
    addAggregate(ctp, "920", extra, [source], { baseAmount: b });
    mapped.add(source);
  }
  const headcount = numeric(inputs.organization.headcount, "l'effectif");
  const fnalParent = headcount >= 50 ? "03" : "02";
  const fnalBase = base("FNAL");
  if (cents(fnalBase) !== cents(headcount >= 50 ? g : t1)) throw new Error("DSN bloquée : l'assiette FNAL ne correspond pas au seuil d'effectif verrouillé.");
  addIndividual("049", fnalParent, input.urssafSiret, amount("FNAL"), ["FNAL"], numeric(line("FNAL").employerRate, "le taux FNAL") * 100, fnalBase);
  addAggregate(headcount >= 50 ? "236" : "332", headcount >= 50 ? "920" : "921", amount("FNAL"), ["FNAL"], { baseAmount: fnalBase });
  mapped.add("FNAL");
  for (const [source, code, ctp] of [["FORMATION", "128", headcount >= 11 ? "971" : "959"], ["TAXE_APPRENTISSAGE", "130", "992"], ["CPF_CDD", "129", "987"]] as const) {
    if (!byCode.has(source)) continue;
    const b = base(source);
    addIndividual(code, "03", input.urssafSiret, amount(source), [source], numeric(line(source).employerRate, source) * 100, b);
    addAggregate(ctp, "920", amount(source), [source], { baseAmount: b });
    mapped.add(source);
  }
  const csgMainBase = base("CSG_DEDUCTIBLE");
  if (cents(csgMainBase) !== cents(base("CSG_CRDS_NON_DEDUCTIBLE"))) throw new Error("DSN bloquée : les assiettes CSG ordinaires diffèrent.");
  const overtimeCsgLine = byCode.get("CSG_NON_IMPOSABLE");
  const overtimeCsgBase = overtimeCsgLine ? numeric(overtimeCsgLine.base, "l'assiette CSG des heures défiscalisées") : 0;
  const crdsBase = numeric(line("CSG_CRDS_NON_DEDUCTIBLE").detail?.crdsBase, "l'assiette CRDS");
  if (cents(crdsBase) !== cents(csgMainBase + overtimeCsgBase)) throw new Error("DSN bloquée : l'assiette CSG/CRDS ne couvre pas exactement les heures défiscalisées.");
  const crdsAmount = round(crdsBase * 0.005);
  const csgSources = ["CSG_DEDUCTIBLE", "CSG_CRDS_NON_DEDUCTIBLE", ...(overtimeCsgLine ? ["CSG_NON_IMPOSABLE"] : [])];
  const combinedCsg = round(amount("CSG_DEDUCTIBLE") + amount("CSG_CRDS_NON_DEDUCTIBLE") + (overtimeCsgLine ? amount("CSG_NON_IMPOSABLE") : 0));
  addBase("04", crdsBase);
  addIndividual("072", "04", input.urssafSiret, round(combinedCsg - crdsAmount), csgSources, 9.2, crdsBase);
  addIndividual("079", "04", input.urssafSiret, crdsAmount, csgSources, 0.5, crdsBase);
  addAggregate("260", "920", combinedCsg, csgSources, { baseAmount: crdsBase });
  mapped.add("CSG_DEDUCTIBLE"); mapped.add("CSG_CRDS_NON_DEDUCTIBLE");
  if (overtimeCsgLine) mapped.add("CSG_NON_IMPOSABLE");

  if (overtime.totalAmount > 0) {
    const employeeReduction = amount("REDUCTION_HS_SALARIALE");
    if (employeeReduction >= 0) throw new Error("DSN bloquée : la réduction salariale HS/HC doit être négative dans le bulletin.");
    addIndividual("114", "03", input.urssafSiret, employeeReduction, ["REDUCTION_HS_SALARIALE"], undefined, overtime.totalAmount);
    addAggregate("003", "921", employeeReduction, ["REDUCTION_HS_SALARIALE"], { contributionAmount: -employeeReduction });
    mapped.add("REDUCTION_HS_SALARIALE");

    const employerReductionLine = byCode.get("DEDUCTION_HS_PATRONALE");
    if (overtime.employerEligibleAmount > 0) {
      if (!employerReductionLine) throw new Error("DSN bloquée : la déduction patronale des heures supplémentaires manque dans le bulletin.");
      if (cents(overtime.employerEligibleAmount) !== cents(overtime.totalAmount)) throw new Error("DSN bloquée : un même salarié mélange heures supplémentaires éligibles et heures complémentaires ; la déduction patronale doit être ventilée.");
      const employerReduction = amount("DEDUCTION_HS_PATRONALE");
      if (employerReduction >= 0) throw new Error("DSN bloquée : la déduction patronale HS doit être négative dans le bulletin.");
      addIndividual("021", "03", input.urssafSiret, employerReduction, ["DEDUCTION_HS_PATRONALE"], undefined, overtime.employerEligibleAmount);
      addAggregate("004", "921", employerReduction, ["DEDUCTION_HS_PATRONALE"], { contributionAmount: -employerReduction });
      mapped.add("DEDUCTION_HS_PATRONALE");
    } else if (employerReductionLine) {
      throw new Error("DSN bloquée : une déduction patronale est présente alors que le bulletin ne contient que des heures complémentaires.");
    }
  } else if (byCode.has("REDUCTION_HS_SALARIALE") || byCode.has("DEDUCTION_HS_PATRONALE") || byCode.has("CSG_NON_IMPOSABLE")) {
    throw new Error("DSN bloquée : des exonérations d'heures sont présentes sans rémunération 017/018 correspondante.");
  }

  const retirementLines = ["RETRAITE_T1", "RETRAITE_T2", "CET", "APEC"].filter((code) => byCode.has(code));
  let retirementDue = round(retirementLines.reduce((total, code) => total + amount(code), 0));
  const t2Line = byCode.get("RETRAITE_T2");
  const t2 = t2Line ? numeric(t2Line.base, "l’assiette retraite T2") : 0;
  const t2Amount = t2Line ? amount("RETRAITE_T2") : 0;
  const cet = byCode.get("CET");
  // Ventilation CET au centime, avec conservation exacte de chaque part du bulletin.
  const cetT1Employee = cet && numeric(cet.base, "l'assiette CET") !== 0 ? round(numeric(cet.amount ?? 0, "la CET salariale") * t1 / numeric(cet.base, "l'assiette CET")) : 0;
  const cetT1Employer = cet && numeric(cet.base, "l'assiette CET") !== 0 ? round(numeric(cet.employerAmount ?? 0, "la CET patronale") * t1 / numeric(cet.base, "l'assiette CET")) : 0;
  if (cet && cents(numeric(cet.base, "l'assiette CET")) !== 0 && cents(numeric(cet.base, "l'assiette CET")) !== cents(t1 + t2)) throw new Error("DSN bloquée : une régularisation CET sur des périodes antérieures doit être rattachée explicitement.");
  addIndividual("131", "02", null, round(amount("RETRAITE_T1") + cetT1Employee + cetT1Employer), ["RETRAITE_T1", "CET"]);
  if (t2Amount !== 0 || (cet && amount("CET") !== cetT1Employee + cetT1Employer)) addIndividual("131", "03", null, round(t2Amount + (cet ? amount("CET") : 0) - cetT1Employee - cetT1Employer), ["RETRAITE_T2", "CET"]);
  addIndividual("142", "02", input.urssafSiret, numeric(line("RETRAITE_T1").employerAmount, "la retraite patronale T1"), ["RETRAITE_T1"], numeric(line("RETRAITE_T1").employerRate, "le taux retraite patronale T1") * 100);
  const controlT2 = round(numeric(t2Line?.employerAmount ?? 0, "la retraite patronale T2") + numeric(cet?.employerAmount ?? 0, "la CET patronale"));
  if (controlT2 !== 0) addIndividual("146", "03", input.urssafSiret, controlT2, ["RETRAITE_T2", "CET"]);
  if (byCode.has("APEC")) addIndividual("132", "03", null, amount("APEC"), ["APEC"]);
  retirementLines.forEach((code) => mapped.add(code));

  if (rgdu.urssaf !== 0) {
    addIndividual("018", "03", input.urssafSiret, rgdu.urssaf, ["RGDU"], undefined, g);
    addAggregate(rgdu.urssaf < 0 ? "668" : "669", "921", rgdu.urssaf, ["RGDU"], rgdu.urssaf < 0 ? { contributionAmount: -rgdu.urssaf } : { baseAmount: rgdu.urssaf });
  }
  if (rgdu.retirement !== 0) addIndividual("106", "03", null, rgdu.retirement, ["RGDU"], undefined, g);
  retirementDue = round(retirementDue + rgdu.retirement);
  liabilities.set(input.retirementOps, retirementDue);
  mapped.add("RGDU");
  if (byCode.has("TAXE_APPRENTISSAGE_SOLDE")) {
    const value = amount("TAXE_APPRENTISSAGE_SOLDE");
    deferred.push({ employeeNir: input.employeeNir, code: "TAXE_APPRENTISSAGE_SOLDE", amount: value, declaration: "DSN avril 2027, exercice 2026, bloc 82 code 076 (CTP annuel à rapprocher)" });
    mapped.add("TAXE_APPRENTISSAGE_SOLDE");
  }
  for (const affiliation of input.complementaryAffiliations ?? []) {
    if (affiliation.validFrom > bulletin.period.first || (affiliation.validUntil && affiliation.validUntil < bulletin.period.last)) throw new Error("DSN bloquée : un changement d'affiliation complémentaire pendant le mois nécessite des périodes segmentées.");
    const sources = affiliation.coverage === "SANTE" ? ["SANTE"] : ["PREVOYANCE", "PREVOYANCE_T2"];
    const covered = sources.filter((code) => byCode.has(code));
    const due = round(covered.reduce((total, code) => total + amount(code), 0));
    const components = affiliation.coverage === "SANTE" ? [{ code: "20", amount: due }] : [
      { code: "11", amount: byCode.has("PREVOYANCE") ? base("PREVOYANCE") : t1 },
      { code: "24", amount: byCode.has("PREVOYANCE_T2") ? base("PREVOYANCE_T2") : t2 },
    ];
    bases.push({ employeeNir: input.employeeNir, code: "31", amount: 0, affiliationId: affiliation.affiliationId, components });
    individual.push({ employeeNir: input.employeeNir, code: "059", baseCode: "31", affiliationId: affiliation.affiliationId, opsIdentifier: null, contributionAmount: due, sourcePayrollCode: sources.join("+"), mappingVersion: LOCKED_CONTRIBUTION_MAPPING_VERSION });
    complementaryAdhesions.push({ id: affiliation.adhesionId, organismCode: affiliation.organismCode, contractReference: affiliation.contractReference, delegateCode: affiliation.delegateCode });
    complementaryAffiliations.push({ employeeNir: input.employeeNir, id: affiliation.affiliationId, adhesionId: affiliation.adhesionId, populationCode: affiliation.populationCode, optionCode: affiliation.optionCode, validFrom: new Date(affiliation.validFrom + "T00:00:00Z"), validUntil: affiliation.validUntil ? new Date(affiliation.validUntil + "T00:00:00Z") : null });
    complementaryPayments.push({ opsIdentifier: affiliation.organismCode, delegateCode: affiliation.delegateCode, contractReference: affiliation.contractReference, amount: due, period: `${bulletin.period.year}M${String(bulletin.period.month).padStart(2, "0")}` });
    liabilities.set(affiliation.organismCode, round((liabilities.get(affiliation.organismCode) ?? 0) + due));
    covered.forEach((code) => mapped.add(code));
  }
  if (byCode.has("FORFAIT_SOCIAL") && amount("FORFAIT_SOCIAL") !== 0) {
    const b = base("FORFAIT_SOCIAL");
    const welfareEmployer = round(["SANTE", "PREVOYANCE", "PREVOYANCE_T2"].filter((code) => byCode.has(code)).reduce((total, code) => total + numeric(line(code).employerAmount ?? 0, code), 0));
    const rate = numeric(line("FORFAIT_SOCIAL").employerRate, "le taux de forfait social");
    if (headcount < 11 || Math.abs(rate - 0.08) > 1e-8 || cents(b) !== cents(welfareEmployer) || amount("FORFAIT_SOCIAL") < 0) throw new Error("DSN bloquée : le forfait social nécessite une assiette prévoyance/santé et le taux de 8 %. Les régularisations nécessitent leur rattachement.");
    addBase("13", b);
    addIndividual("071", "13", input.urssafSiret, amount("FORFAIT_SOCIAL"), ["FORFAIT_SOCIAL"], 8, b);
    addAggregate("479", "920", amount("FORFAIT_SOCIAL"), ["FORFAIT_SOCIAL"], { baseAmount: b });
    mapped.add("FORFAIT_SOCIAL");
  }
  if (byCode.has("VERSEMENT_MOBILITE") && amount("VERSEMENT_MOBILITE") !== 0) {
    const details = inputs.organization.mobilityDsn;
    if (details && ["75056", "69123", "13055"].includes(details.communeCode)) throw new Error("DSN bloquée : renseignez le code INSEE de l'arrondissement de travail pour le versement mobilité, et non celui de la ville parente.");
    if (!details || details.source !== "URSSAF" || !/^(\d{5}|2[AB]\d{3})$/.test(details.communeCode) || !details.validFrom || details.validFrom > bulletin.period.first || (details.validUntil && details.validUntil < bulletin.period.last)) throw new Error("DSN bloquée : le versement mobilité nécessite la commune, les trois composantes et leur validité dans le bulletin verrouillé. Un taux manuel ou historique sans ventilation ne suffit pas.");
    const parts = [["vm", "081", "900"], ["vma", "082", "901"], ["vmr", "918", "820"]] as const;
    const rates = parts.map(([part]) => numeric(details.components?.[part], "la composante mobilité " + part));
    const totalRate = rates.reduce((total, rate) => total + rate, 0);
    const b = base("VERSEMENT_MOBILITE");
    if (rates.some((rate) => rate < 0 || Math.abs(rate * 100 - Math.round(rate * 100)) > 1e-7) || Math.abs(totalRate - numeric(inputs.organization.mobilityRatePercent, "le taux mobilité")) > 1e-7 || Math.abs(totalRate / 100 - numeric(line("VERSEMENT_MOBILITE").employerRate, "le taux mobilité du bulletin")) > 1e-7 || cents(b) !== cents(g) || amount("VERSEMENT_MOBILITE") < 0) throw new Error("DSN bloquée : la ventilation mobilité ou la précision des taux ne correspond pas au bulletin verrouillé.");
    addBase("57", b);
    const active = parts.filter(([part]) => details.components[part] > 0);
    let allocated = 0;
    active.forEach(([part, code, ctp], index) => {
      const rate = details.components[part];
      // Le dernier composant conserve le centime d'arrondi du journal regroupé.
      const due = index === active.length - 1 ? round(amount("VERSEMENT_MOBILITE") - allocated) : round(b * rate / 100);
      if (due < 0) throw new Error("DSN bloquée : ventilation mobilité négative.");
      allocated = round(allocated + due);
      addIndividual(code, "57", input.urssafSiret, due, ["VERSEMENT_MOBILITE"], rate, b, details.communeCode);
      addAggregate(ctp, "920", due, ["VERSEMENT_MOBILITE"], { baseAmount: b, ratePercent: rate, inseeCommuneCode: details.communeCode });
    });
    if (!active.length || cents(allocated) !== cents(amount("VERSEMENT_MOBILITE"))) throw new Error("DSN bloquée : la ventilation mobilité ne couvre pas la charge du bulletin.");
    mapped.add("VERSEMENT_MOBILITE");
  }
  // Une rubrique explicitement nulle ne nécessite pas d'affiliation, mais une rubrique inconnue reste bloquante.
  for (const code of ["PREVOYANCE", "PREVOYANCE_T2", "SANTE", "VERSEMENT_MOBILITE", "FORFAIT_SOCIAL"]) if (byCode.has(code) && amount(code) === 0) mapped.add(code);
  const missing = journal.filter((item) => !mapped.has(item.code)).map((item) => item.code);
  if (missing.length) throw new Error(`DSN bloquée : cotisations non mappées ou affiliations complémentaires à compléter : ${missing.join(", ")}.`);
  const liabilityTotal = [...liabilities.values()].reduce((total, value) => total + cents(value), 0);
  const deferredTotal = deferred.reduce((total, item) => total + cents(item.amount), 0);
  if (liabilityTotal + deferredTotal !== cents(bulletin.totals.employeeContributions) + cents(bulletin.totals.employerContributions)) throw new Error("DSN bloquée : la ventilation par organisme ne couvre pas exactement les cotisations du bulletin.");
  if ([...liabilities.values()].some((value) => value < 0)) throw new Error("DSN bloquée : un crédit organisme nécessite une déclaration de régularisation et un paiement distinct.");
  return { bases, individual, aggregates: [...aggregates.values()], liabilities: [...liabilities].map(([opsIdentifier, value]) => ({ opsIdentifier, amount: value })), deferred, atmpRatePercent, unemploymentBase, hoursPaid: numeric(bulletin.totals.hoursPaid, "les heures payées"), grossSubject: g, overtime, complementaryAdhesions, complementaryAffiliations, complementaryPayments };
}

/** Additionne les assiettes une seule fois par salarié/CTP, pas une fois par cotisation composante. */
export function mergeLockedAggregates(groups: readonly DsnAggregatedContribution[][]): DsnAggregatedContribution[] {
  const merged = new Map<string, DsnAggregatedContribution>();
  for (const group of groups) for (const aggregate of group) {
    const key = [aggregate.code, aggregate.baseQualifier, aggregate.ratePercent ?? "", aggregate.inseeCommuneCode ?? ""].join("/");
    const prior = merged.get(key);
    if (!prior) { merged.set(key, { ...aggregate, sourcePayrollCodes: [...aggregate.sourcePayrollCodes] }); continue; }
    prior.payableAmount = round(prior.payableAmount + aggregate.payableAmount);
    for (const field of ["baseAmount", "contributionAmount"] as const) if (aggregate[field] !== undefined && aggregate[field] !== null) prior[field] = round((prior[field] ?? 0) + aggregate[field]!);
    prior.sourcePayrollCodes = [...new Set([...prior.sourcePayrollCodes, ...aggregate.sourcePayrollCodes])];
  }
  return [...merged.values()].sort((a, b) => a.code.localeCompare(b.code) || a.baseQualifier.localeCompare(b.baseQualifier) || (a.ratePercent ?? 0) - (b.ratePercent ?? 0));
}
