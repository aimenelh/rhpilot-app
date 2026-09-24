// Bulletin de démonstration de la vitrine : il appelle exactement le moteur du
// logiciel (calculateSocialPayroll) sur un salarié fictif, puis range les lignes
// comme sur un bulletin clarifié. Utilisé côté serveur (premier rendu) et dans
// le worker du navigateur (recalculs), jamais avec une donnée réelle.
import socialRules from "modele-social";
import { calculateSocialPayroll, SOCIAL_MODEL_VERSION, type SocialContributionDetail } from "@/lib/payroll/social-engine";
import { clampDemoInput, type DemoInput, type DemoReference, type DemoResult, type DemoRow } from "./payslipDemoShared";

export { DEFAULT_DEMO_INPUT, DEMO_LIMITS, clampDemoInput } from "./payslipDemoShared";
export type { DemoInput, DemoResult, DemoRow, DemoGroup, DemoReference, DemoSide } from "./payslipDemoShared";

// Ordre et regroupement du bulletin clarifié (arrêté du 25 février 2016).
const GROUPS: { title: string; keys: string[] }[] = [
  { title: "Santé", keys: ["maladie", "sante", "invalidite_deces"] },
  { title: "Accidents du travail et maladies professionnelles", keys: ["atmp"] },
  { title: "Retraite", keys: ["vieillesse_plafonnee", "vieillesse_deplafonnee", "retraite_complementaire"] },
  { title: "Famille", keys: ["allocations_familiales"] },
  { title: "Assurance chômage", keys: ["assurance_chomage", "apec"] },
  { title: "Autres contributions dues par l’employeur", keys: ["autres_charges"] },
  { title: "CSG et CRDS", keys: ["csg_deductible", "csg_non_deductible", "csg_non_imposable"] },
  { title: "Allègement de cotisations", keys: ["rgdu"] },
];

const ROW_LABELS: Record<string, string> = {
  maladie: "Sécurité sociale, maladie, maternité, invalidité, décès",
  sante: "Complémentaire santé",
  invalidite_deces: "Prévoyance incapacité, invalidité, décès",
  vieillesse_plafonnee: "Vieillesse plafonnée",
  vieillesse_deplafonnee: "Vieillesse déplafonnée",
  retraite_complementaire: "Retraite complémentaire",
  apec: "APEC",
  autres_charges: "Autres contributions dues par l’employeur",
};

const rowKey = (code: string) => code.replace(/_(salarie|employeur)$/, "");

type RawRule = { références?: Record<string, string> } | null | undefined;

function referencesFor(sourceRule: string): DemoReference[] {
  const rules = socialRules as unknown as Record<string, RawRule>;
  let name = sourceRule;
  while (name) {
    const refs = rules[name]?.références;
    if (refs && Object.keys(refs).length) return Object.entries(refs).slice(0, 2).map(([title, href]) => ({ title, href }));
    const cut = name.lastIndexOf(" . ");
    name = cut > 0 ? name.slice(0, cut) : "";
  }
  return [];
}

function toRows(details: SocialContributionDetail[]): Map<string, DemoRow> {
  const rows = new Map<string, DemoRow>();
  for (const detail of details) {
    const key = rowKey(detail.code);
    const row = rows.get(key) ?? {
      key,
      label: ROW_LABELS[key] ?? detail.label.replace(/\s+—\s+part (salarié|employeur)$/, ""),
      base: detail.baseAmount,
      employee: null,
      employer: null,
      sourceRule: detail.sourceRule,
      references: referencesFor(detail.sourceRule),
    };
    const side = { amount: detail.amount, rate: detail.rate };
    if (detail.side === "EMPLOYEE") row.employee = side;
    else row.employer = side;
    if (row.base === null && detail.baseAmount !== null) row.base = detail.baseAmount;
    rows.set(key, row);
  }
  return rows;
}

export function computePayslipDemo(raw: DemoInput): DemoResult {
  const input = clampDemoInput(raw);
  const result = calculateSocialPayroll({
    grossAmount: input.gross,
    legalCategory: "SAS",
    calculationDate: new Date(Date.UTC(2026, 9, 31)),
    companyCreationDate: new Date(Date.UTC(2021, 0, 1)),
    contractType: "CDI",
    hireDate: new Date(Date.UTC(2024, 2, 1)),
    executiveStatus: input.cadre,
    healthPlanMonthlyAmount: input.healthMonthly,
    healthPlanEmployerRate: input.healthEmployerRate,
    situation: { "établissement . taux ATMP": `${input.atmpRate}%` },
  });
  const rows = toRows(result.contributionDetails);
  const groups = GROUPS.map((group) => ({ title: group.title, rows: group.keys.flatMap((key) => (rows.has(key) ? [rows.get(key)!] : [])) })).filter((group) => group.rows.length);
  const placed = new Set(GROUPS.flatMap((group) => group.keys));
  const others = [...rows.values()].filter((row) => !placed.has(row.key));
  if (others.length) groups.push({ title: "Autres", rows: others });
  return {
    input,
    groups,
    gross: result.grossAmount,
    employeeContributions: result.employeeContributions,
    employerContributions: result.employerContributions,
    netBeforeTax: result.netBeforeTax,
    netSocial: result.netSocialAmount,
    netTaxable: result.netTaxableAmount,
    employerCost: result.employerCost,
    modelVersion: SOCIAL_MODEL_VERSION,
  };
}
