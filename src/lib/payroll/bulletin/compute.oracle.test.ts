/**
 * Oracle : sur un mois simple (mois complet, sans cumul antérieur ni absence),
 * le moteur de bulletin doit retrouver au centime près les montants du modèle
 * social Urssaf (modele-social). Toute évolution divergente de l'un ou de l'autre
 * fait échouer ce test.
 */
import { describe, expect, it } from "vitest";
import Engine from "publicodes";
import socialRules from "modele-social";
import { computePayslip } from "./compute";
import { FULL_TIME_SCHEDULE, type WeeklySchedule } from "./calendar";
import type { ContractKind, PayslipInput, PayslipResult } from "./types";

const engine = new Engine(socialRules, { logger: { log: () => undefined, warn: () => undefined, error: () => undefined } });

function seuil(headcount: number): string {
  if (headcount < 5) return "'moins de 5'";
  if (headcount < 11) return "'moins de 11'";
  if (headcount < 20) return "'moins de 20'";
  if (headcount < 50) return "'moins de 50'";
  if (headcount < 150) return "'moins de 150'";
  if (headcount < 250) return "'moins de 250'";
  return "'plus de 250'";
}

type Case = {
  name: string;
  month: number;
  gross: number;
  executive?: boolean;
  headcount?: number;
  contract?: ContractKind;
  weeklyHours?: number;
  overtimeHours?: number;
  complementaryHours?: number;
  hireDate?: string;
  health?: { amount: number; employerShare: number };
  alsaceMoselle?: boolean;
};

function modelOf(c: Case) {
  const headcount = c.headcount ?? 4;
  const monthlyHours = c.weeklyHours ? Math.round(c.weeklyHours * 52 / 12 * 100) / 100 : 151.67;
  const contract = c.contract ?? "CDI";
  const situation: Record<string, string> = {
    "salarié . contrat . salaire brut": `${c.gross} €/mois`,
    "entreprise . catégorie juridique": "'SAS'",
    date: `01/${String(c.month).padStart(2, "0")}/2026`,
    "entreprise . date de création": "01/01/2015",
    "salarié . contrat": `'${contract === "APPRENTISSAGE" ? "apprentissage" : contract}'`,
    "salarié . contrat . date d'embauche": "01/01/2024",
    "dirigeant . assimilé salarié": "non",
    "salarié . cotisations . exonérations . JEI": "non",
    "entreprise . salariés . effectif . seuil": seuil(headcount),
    "salarié . cotisations . ATMP . taux fonctions support": "non",
    "établissement . taux ATMP": "1.2%",
    "établissement . commune . nom": c.alsaceMoselle ? "'Metz'" : "'Montpellier'",
    "établissement . commune . département": c.alsaceMoselle ? "'Moselle'" : "'34'",
    "salarié . cotisations . prévoyances . santé . montant": `${c.health?.amount ?? 60} €/mois`,
    "salarié . cotisations . prévoyances . santé . taux employeur": `${Math.round((c.health?.employerShare ?? 0.5) * 100)}%`,
  };
  if (contract !== "APPRENTISSAGE") situation["salarié . contrat . statut cadre"] = c.executive ? "oui" : "non";
  if (contract === "APPRENTISSAGE") {
    situation["salarié . contrat . apprentissage . âge"] = "'de 18 à 20'";
    situation["salarié . contrat . apprentissage . diplôme"] = "'niveau 5'";
  }
  if (contract === "CDD") {
    // Le simulateur étale l'indemnité de fin de contrat et l'indemnité de congés sur chaque mois : un bulletin les verse à la fin du contrat.
    situation["salarié . contrat . CDD . motif"] = "'classique . accroissement activité'";
    situation["salarié . contrat . CDD . indemnité de fin de contrat"] = "non";
    situation["salarié . contrat . CDD . reconduction en CDI"] = "oui";
  }
  if (c.weeklyHours) {
    situation["salarié . contrat . temps de travail . temps partiel"] = "oui";
    situation["salarié . contrat . temps de travail . temps partiel . heures par semaine"] = `${c.weeklyHours} heure/semaine`;
  }
  if (c.overtimeHours) situation["salarié . temps de travail . heures supplémentaires"] = `${c.overtimeHours} heure/mois`;
  if (c.complementaryHours) situation["salarié . temps de travail . heures complémentaires"] = `${c.complementaryHours} heure/mois`;
  engine.setSituation(situation as never);
  // Smic figé à 12,02 €/h pour la RGDU 2026 (décret n° 2026-509), comme le moteur.
  const workingTime = engine.evaluate("salarié . temps de travail").nodeValue as number;
  // La paie retient 151,67 h pour un temps plein (Smic mensuel 1 823,03 €) ; le modèle garde 151,666… h.
  const payrollHours = Math.round(workingTime * 100) / 100;
  engine.setSituation({ ...situation, "salarié . temps de travail . SMIC": `${Math.round(payrollHours * 12.02 * 10000) / 10000} €/mois` } as never);
  const value = (rule: string) => { const v = engine.evaluate(rule).nodeValue; return typeof v === "number" ? v : 0; };
  const vmRate = value("établissement . commune . taux versement mobilité");
  return {
    monthlyHours,
    vmRatePercent: vmRate,
    values: {
      gross: value("salarié . rémunération . brut"),
      maladieEmployer: value("salarié . cotisations . maladie . employeur"),
      maladieEmployee: value("salarié . cotisations . maladie . salarié"),
      santeEmployee: value("salarié . cotisations . prévoyances . santé . salarié"),
      santeEmployer: value("salarié . cotisations . prévoyances . santé . employeur"),
      prevoyanceEmployer: value("salarié . cotisations . prévoyances . incapacité invalidité décès . employeur"),
      atmp: value("salarié . cotisations . ATMP"),
      vieillessePlafEmployee: value("salarié . cotisations . vieillesse . plafonnée . salarié"),
      vieillessePlafEmployer: value("salarié . cotisations . vieillesse . plafonnée . employeur"),
      vieillesseDeplafEmployee: value("salarié . cotisations . vieillesse . déplafonnée . salarié"),
      vieillesseDeplafEmployer: value("salarié . cotisations . vieillesse . déplafonnée . employeur"),
      retraiteEmployee: value("salarié . cotisations . retraite complémentaire-CEG-CET . salarié"),
      retraiteEmployer: value("salarié . cotisations . retraite complémentaire-CEG-CET . employeur"),
      famille: value("salarié . cotisations . allocations familiales"),
      chomage: value("salarié . cotisations . assurance chômage"),
      apecEmployee: value("salarié . cotisations . APEC . salarié"),
      apecEmployer: value("salarié . cotisations . APEC . employeur"),
      csgDeductible: value("salarié . cotisations . CSG-CRDS . CSG . déductible"),
      csgNonDeductible: value("salarié . cotisations . CSG-CRDS . sur revenus imposables non déductible"),
      csgNonImposable: value("salarié . cotisations . CSG-CRDS . sur revenus non imposables"),
      autresEmployeur: value("salarié . cotisations . autres employeur") - value("salarié . cotisations . PEEC"),
      rgdu: value("salarié . cotisations . exonérations . RGDU"),
      hsEmployee: value("salarié . cotisations . exonérations . heures supplémentaires . salarié"),
      hsEmployer: value("salarié . cotisations . exonérations . heures supplémentaires . employeur"),
      employeeTotal: value("salarié . cotisations . salarié"),
      netBeforeTax: value("salarié . rémunération . net . à payer avant impôt"),
      netSocial: value("salarié . rémunération . montant net social"),
      netTaxable: value("salarié . rémunération . net . imposable") - value("salarié . cotisations . prévoyances . incapacité invalidité décès . employeur"),
    },
  };
}

function oursOf(c: Case, model: ReturnType<typeof modelOf>): PayslipResult {
  const weekly = c.weeklyHours ?? 35;
  const perDay = weekly / 5;
  const schedule: WeeklySchedule = c.weeklyHours ? [perDay, perDay, perDay, perDay, perDay, 0, 0] : FULL_TIME_SCHEDULE;
  const input: PayslipInput = {
    period: { year: 2026, month: c.month },
    organization: {
      headcount: c.headcount ?? 4,
      atmpRatePercent: 1.2,
      mobilityRatePercent: model.vmRatePercent,
      territory: "METROPOLE",
      alsaceMoselle: c.alsaceMoselle,
      healthPlan: { monthlyAmount: c.health?.amount ?? 60, employerShare: c.health?.employerShare ?? 0.5 },
      ijssSubrogation: true,
      paidLeaveMethod: "OUVRABLES",
    },
    employee: { id: "e1", displayName: "Salarié test", contract: c.contract ?? "CDI", executive: Boolean(c.executive), hireDate: c.hireDate ?? "2024-01-01" },
    pay: { monthlyBaseSalary: c.gross, contractMonthlyHours: model.monthlyHours, schedule },
    overtime: c.overtimeHours ? { hoursFirstBand: c.overtimeHours } : undefined,
    complementaryHours: c.complementaryHours ? { hoursWithinTenth: c.complementaryHours } : undefined,
    withholding: { mode: "PERSONALIZED", rate: 0 },
  };
  return computePayslip(input);
}

function line(result: PayslipResult, ...codes: string[]) {
  const lines = result.lines.filter((candidate) => codes.includes(candidate.code));
  return { employee: lines.reduce((t, l) => t + (l.amount ?? 0), 0), employer: lines.reduce((t, l) => t + (l.employerAmount ?? 0), 0) };
}
function autres(result: PayslipResult) {
  return result.lines.filter((l) => l.section === "AUTRES_EMPLOYEUR").reduce((t, l) => t + (l.employerAmount ?? 0), 0);
}

const CASES: Case[] = [
  { name: "non-cadre au Smic, janvier", month: 1, gross: 1823.03 },
  { name: "non-cadre 2 500 €, mars", month: 3, gross: 2500 },
  { name: "non-cadre 3 400 €, 25 salariés", month: 3, gross: 3400, headcount: 25 },
  { name: "cadre 5 000 € (tranche 2)", month: 4, gross: 5000, executive: true },
  { name: "cadre 20 000 € (au-delà de 4 plafonds)", month: 5, gross: 20000, executive: true, headcount: 60 },
  { name: "cadre 38 000 € (au-delà de 8 plafonds)", month: 2, gross: 38000, executive: true, headcount: 12 },
  { name: "temps partiel 24 h, 1 500 €", month: 3, gross: 1500, weeklyHours: 24 },
  { name: "CDD 2 200 €, 15 salariés", month: 9, gross: 2200, contract: "CDD", headcount: 15 },
  { name: "apprenti 1 100 €, contrat 2025", month: 3, gross: 1100, contract: "APPRENTISSAGE", hireDate: "2025-09-01" },
  { name: "apprenti 850 € (sous 50 % du Smic)", month: 3, gross: 850, contract: "APPRENTISSAGE", hireDate: "2025-09-01" },
  { name: "non-cadre 2 500 € + 10 h sup, 8 salariés", month: 3, gross: 2500, overtimeHours: 10, headcount: 8 },
  { name: "non-cadre 2 100 € + 6 h sup, 30 salariés", month: 10, gross: 2100, overtimeHours: 6, headcount: 30 },
  { name: "temps partiel 24 h + 4 h complémentaires", month: 3, gross: 1500, weeklyHours: 24, complementaryHours: 4 },
  { name: "mutuelle prise en charge à 100 %", month: 3, gross: 2900, health: { amount: 85, employerShare: 1 }, headcount: 11 },
  { name: "Alsace-Moselle, non-cadre 2 500 €", month: 3, gross: 2500, alsaceMoselle: true },
  { name: "Alsace-Moselle, cadre 5 000 €, 30 salariés", month: 6, gross: 5000, executive: true, headcount: 30, alsaceMoselle: true },
  { name: "Alsace-Moselle, apprenti 1 100 €", month: 3, gross: 1100, contract: "APPRENTISSAGE", hireDate: "2025-09-01", alsaceMoselle: true },
];

describe("moteur de bulletin — oracle modele-social (mois simples)", () => {
  for (const c of CASES) {
    it(c.name, () => {
      const model = modelOf(c);
      const ours = oursOf(c, model);
      const m = model.values;
      // Le modèle arrondit à l'euro le montant des heures défiscalisées ; le bulletin garde les centimes.
      const overtimeCase = Boolean(c.overtimeHours || c.complementaryHours);
      const hsTolerance = overtimeCase ? 0.06 : 0.03;
      const near = (actual: number, expected: number, label: string, tolerance = 0.03) => {
        expect(Math.abs(actual - expected), `${label} : moteur ${actual.toFixed(2)} / modèle ${expected.toFixed(2)}`).toBeLessThanOrEqual(tolerance);
      };
      near(ours.totals.grossTotal, m.gross, "brut");
      near(line(ours, "MALADIE").employer, m.maladieEmployer, "maladie employeur");
      near(line(ours, "MALADIE_ALSACE_MOSELLE").employee, m.maladieEmployee, "maladie salarié (régime local)");
      near(line(ours, "SANTE").employee, m.santeEmployee, "santé salarié");
      near(line(ours, "SANTE").employer, m.santeEmployer, "santé employeur");
      near(line(ours, "PREVOYANCE", "PREVOYANCE_T2").employer, m.prevoyanceEmployer, "prévoyance employeur");
      near(line(ours, "ATMP").employer, m.atmp, "AT/MP");
      near(line(ours, "VIEILLESSE_PLAF").employee, m.vieillessePlafEmployee, "vieillesse plafonnée salarié");
      near(line(ours, "VIEILLESSE_PLAF").employer, m.vieillessePlafEmployer, "vieillesse plafonnée employeur");
      near(line(ours, "VIEILLESSE_DEPLAF").employee, m.vieillesseDeplafEmployee, "vieillesse déplafonnée salarié");
      near(line(ours, "VIEILLESSE_DEPLAF").employer, m.vieillesseDeplafEmployer, "vieillesse déplafonnée employeur");
      near(line(ours, "RETRAITE_T1", "RETRAITE_T2", "CET").employee, m.retraiteEmployee, "retraite complémentaire salarié");
      near(line(ours, "RETRAITE_T1", "RETRAITE_T2", "CET").employer, m.retraiteEmployer, "retraite complémentaire employeur");
      near(line(ours, "FAMILLE").employer, m.famille, "famille");
      near(line(ours, "CHOMAGE", "AGS").employer, m.chomage, "assurance chômage et AGS");
      near(line(ours, "APEC").employee, m.apecEmployee, "Apec salarié");
      near(line(ours, "APEC").employer, m.apecEmployer, "Apec employeur");
      near(line(ours, "CSG_DEDUCTIBLE").employee, m.csgDeductible, "CSG déductible", hsTolerance);
      near(line(ours, "CSG_CRDS_NON_DEDUCTIBLE").employee, m.csgNonDeductible, "CSG/CRDS non déductible");
      near(line(ours, "CSG_NON_IMPOSABLE").employee, m.csgNonImposable, "CSG sur heures défiscalisées", hsTolerance);
      near(autres(ours), m.autresEmployeur, "autres contributions employeur (hors PEEC)");
      near(-line(ours, "RGDU").employer, m.rgdu, "RGDU");
      // Le modèle n'applique pas la réduction salariale aux heures complémentaires, que l'article L241-17 du CSS vise pourtant.
      const hcReduction = c.complementaryHours ? -line(ours, "REDUCTION_HS_SALARIALE").employee : 0;
      if (c.complementaryHours) expect(hcReduction).toBeGreaterThan(0);
      else near(-line(ours, "REDUCTION_HS_SALARIALE").employee, m.hsEmployee, "réduction salariale heures sup");
      near(-line(ours, "DEDUCTION_HS_PATRONALE").employer, m.hsEmployer, "déduction patronale heures sup");
      near(ours.totals.employeeContributions, m.employeeTotal - hcReduction, "total des cotisations salariales", 0.06);
      near(ours.totals.netBeforeTax, m.netBeforeTax + hcReduction, "net à payer avant impôt", 0.06);
      near(ours.totals.netSocial, m.netSocial + hcReduction, "montant net social", 0.06);
      near(ours.totals.netTaxable, m.netTaxable + hcReduction, "net imposable", overtimeCase ? 0.6 : 0.06);
    });
  }
});
