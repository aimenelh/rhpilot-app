import type { PayslipInput, PayslipLine, PayslipResult } from "./bulletin/types";
import type { DsnAggregatedContribution, DsnAssessedBase, DsnIndividualContribution } from "./dsn-p26v01-complete";

export const LOCKED_CONTRIBUTION_MAPPING_VERSION = "P26V01-RG-2026.1";
export const LOCKED_CONTRIBUTION_SOURCES = [
  "https://www.urssaf.fr/accueil/actualites/declaration-cotisation-am-af.html",
  "https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/reduction-generale-cotisation.html",
  "https://net-entreprises.custhelp.com/app/answers/detail_dsn/a_id/2556/",
  "https://net-entreprises.custhelp.com/app/answers/detail_dsn/a_id/2537/",
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
}): LockedContributionData {
  const { bulletin, inputs } = readLockedContributionSnapshot(input.snapshot);
  if (!/^\d{14}$/.test(input.urssafSiret) || !/^\d{14}$/.test(input.retirementOps)) throw new Error("DSN bloquée : les organismes Urssaf et retraite doivent être renseignés depuis les notifications d'affiliation.");
  if (inputs.employee.contract === "APPRENTISSAGE") throw new Error("DSN bloquée : les exonérations sociales spécifiques des apprentis nécessitent encore leur mapping déclaratif.");
  if (inputs.organization.territory !== "METROPOLE" || inputs.organization.alsaceMoselle) throw new Error("DSN bloquée : le mapping social actuel couvre la métropole hors régime local Alsace-Moselle.");
  if ((inputs.pay.structuralOvertimeMonthlyHours ?? 0) > 0 || Object.values(inputs.overtime ?? {}).some((v) => typeof v === "number" && v !== 0) ||
      Object.values(inputs.complementaryHours ?? {}).some((v) => typeof v === "number" && v !== 0)) {
    throw new Error("DSN bloquée : les heures supplémentaires ou complémentaires nécessitent leurs blocs de rémunération spécifiques.");
  }
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
  const bases: DsnAssessedBase[] = [];
  const addBase = (code: string, value: number, components?: DsnAssessedBase["components"]): void => { bases.push({ employeeNir: input.employeeNir, code, amount: round(value), ...(components ? { components } : {}) }); };
  const addIndividual = (code: string, baseCode: string, opsIdentifier: string | null, value: number, sources: string[], ratePercent?: number, baseAmount?: number): void => {
    individual.push({ employeeNir: input.employeeNir, code, baseCode, opsIdentifier, contributionAmount: round(value), sourcePayrollCode: sources.join("+"), mappingVersion: LOCKED_CONTRIBUTION_MAPPING_VERSION, ...(ratePercent === undefined ? {} : { ratePercent }), ...(baseAmount === undefined ? {} : { baseAmount }) });
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
  const csgBase = base("CSG_DEDUCTIBLE");
  if (cents(csgBase) !== cents(base("CSG_CRDS_NON_DEDUCTIBLE"))) throw new Error("DSN bloquée : les assiettes CSG diffèrent.");
  const crdsBase = numeric(line("CSG_CRDS_NON_DEDUCTIBLE").detail?.crdsBase, "l'assiette CRDS");
  if (cents(crdsBase) !== cents(csgBase)) throw new Error("DSN bloquée : la CSG des heures défiscalisées nécessite son mapping distinct.");
  const crdsAmount = round(crdsBase * 0.005);
  const combinedCsg = round(amount("CSG_DEDUCTIBLE") + amount("CSG_CRDS_NON_DEDUCTIBLE"));
  addBase("04", csgBase);
  addIndividual("072", "04", input.urssafSiret, round(combinedCsg - crdsAmount), ["CSG_DEDUCTIBLE", "CSG_CRDS_NON_DEDUCTIBLE"], 9.2, csgBase);
  addIndividual("079", "04", input.urssafSiret, crdsAmount, ["CSG_CRDS_NON_DEDUCTIBLE"], 0.5, crdsBase);
  addAggregate("260", "920", combinedCsg, ["CSG_DEDUCTIBLE", "CSG_CRDS_NON_DEDUCTIBLE"], { baseAmount: csgBase });
  mapped.add("CSG_DEDUCTIBLE"); mapped.add("CSG_CRDS_NON_DEDUCTIBLE");

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
  // Une rubrique explicitement nulle ne nécessite pas d'affiliation, mais une rubrique inconnue reste bloquante.
  for (const code of ["PREVOYANCE", "PREVOYANCE_T2", "SANTE", "VERSEMENT_MOBILITE", "FORFAIT_SOCIAL"]) if (byCode.has(code) && amount(code) === 0) mapped.add(code);
  const missing = journal.filter((item) => !mapped.has(item.code)).map((item) => item.code);
  if (missing.length) throw new Error(`DSN bloquée : cotisations non mappées ou affiliations complémentaires à compléter : ${missing.join(", ")}.`);
  const liabilityTotal = [...liabilities.values()].reduce((total, value) => total + cents(value), 0);
  const deferredTotal = deferred.reduce((total, item) => total + cents(item.amount), 0);
  if (liabilityTotal + deferredTotal !== cents(bulletin.totals.employeeContributions) + cents(bulletin.totals.employerContributions)) throw new Error("DSN bloquée : la ventilation par organisme ne couvre pas exactement les cotisations du bulletin.");
  if ([...liabilities.values()].some((value) => value < 0)) throw new Error("DSN bloquée : un crédit organisme nécessite une déclaration de régularisation et un paiement distinct.");
  return { bases, individual, aggregates: [...aggregates.values()], liabilities: [...liabilities].map(([opsIdentifier, value]) => ({ opsIdentifier, amount: value })), deferred, atmpRatePercent, unemploymentBase, hoursPaid: numeric(bulletin.totals.hoursPaid, "les heures payées"), grossSubject: g };
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
