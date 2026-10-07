/**
 * Paie de l'entreprise de démonstration : données entièrement fictives (salaires,
 * taux PAS, NIR, organismes) et calculs purs des reprises de début d'année.
 *
 * Les cumuls de reprise ne sont pas inventés : ils sont produits par le moteur de
 * bulletin lui-même, mois après mois, depuis janvier (ou l'embauche).
 */
import { FULL_TIME_SCHEDULE, daysBetweenInclusive } from "./bulletin/calendar";
import { computePayslip } from "./bulletin/compute";
import { paidLeaveReferenceYear } from "./bulletin/inputs";
import { normalizeDsnComplementaryAffiliations } from "./dsn-complementary-affiliations";
import { rgduUrssafFraction } from "./dsn-locked-contributions";
import type { ContractKind, OrganizationPayrollContext, PaidLeaveBalances, PayslipResult, YearToDate } from "./bulletin/types";

export type DemoProfessionalCategory = "CADRE" | "AGENT_DE_MAITRISE" | "EMPLOYE" | "OUVRIER";

export type DemoPayrollEmployee = {
  firstName: string;
  contract: ContractKind;
  category: DemoProfessionalCategory;
  /** Classification Syntec (IDCC 1486) : contrôle du minimum conventionnel. */
  classificationCode: string;
  classificationLabel: string;
  salary: number;
  pasRate: number;
  birthDate: string;
  sex: "1" | "2";
  birthPlace: string;
  birthDepartment: string;
  birthCommune: string;
  address: { line: string; postalCode: string; city: string };
  pcsEse: string;
  /** S21.G00.40.002 : 04 cadre, 05 profession intermédiaire, 06 employé, 07 ouvrier. */
  conventionalStatus: "04" | "05" | "06" | "07";
  /** CDD : motif de recours S21.G00.40.021. */
  fixedTermReason?: string;
  alternance?: { contractYear: number | null; hasBaccalaureateOrHigher: boolean | null; preparedDiplomaLevel: string | null };
};

/** Salariés fictifs (prénoms du générateur de démonstration), entreprise de conseil informatique à Nîmes. */
export const DEMO_PAYROLL_EMPLOYEES: readonly DemoPayrollEmployee[] = [
  { firstName: "Antoine", contract: "CDI", category: "OUVRIER", classificationCode: "ETAM_1.2", classificationLabel: "ETAM position 1.2, coefficient 250", salary: 2250, pasRate: 0.03, birthDate: "1994-03-12", sex: "1", birthPlace: "Alès", birthDepartment: "30", birthCommune: "007", address: { line: "4 rue de la Madeleine", postalCode: "30000", city: "Nîmes" }, pcsEse: "628a", conventionalStatus: "07" },
  { firstName: "Emma", contract: "CDI", category: "CADRE", classificationCode: "IC_2.2", classificationLabel: "Ingénieur et cadre position 2.2, coefficient 130", salary: 3900, pasRate: 0.07, birthDate: "1988-11-03", sex: "2", birthPlace: "Montpellier", birthDepartment: "34", birthCommune: "172", address: { line: "18 boulevard Victor Hugo", postalCode: "30000", city: "Nîmes" }, pcsEse: "375b", conventionalStatus: "04" },
  { firstName: "Manon", contract: "CDI", category: "AGENT_DE_MAITRISE", classificationCode: "ETAM_3.1", classificationLabel: "ETAM position 3.1, coefficient 400", salary: 2850, pasRate: 0.05, birthDate: "1990-06-21", sex: "2", birthPlace: "Nîmes", birthDepartment: "30", birthCommune: "189", address: { line: "7 rue Fresque", postalCode: "30000", city: "Nîmes" }, pcsEse: "461f", conventionalStatus: "05" },
  { firstName: "Karim", contract: "APPRENTISSAGE", category: "OUVRIER", classificationCode: "ETAM_1.1", classificationLabel: "Apprenti, ETAM position 1.1", salary: 1200, pasRate: 0, birthDate: "2007-04-15", sex: "1", birthPlace: "Nîmes", birthDepartment: "30", birthCommune: "189", address: { line: "22 avenue Jean Jaurès", postalCode: "30900", city: "Nîmes" }, pcsEse: "628a", conventionalStatus: "07", alternance: { contractYear: 1, hasBaccalaureateOrHigher: null, preparedDiplomaLevel: "05" } },
  { firstName: "Nicolas", contract: "CDI", category: "CADRE", classificationCode: "IC_2.3", classificationLabel: "Ingénieur et cadre position 2.3, coefficient 150", salary: 4600, pasRate: 0.12, birthDate: "1985-01-30", sex: "1", birthPlace: "Avignon", birthDepartment: "84", birthCommune: "007", address: { line: "3 place de la Maison Carrée", postalCode: "30000", city: "Nîmes" }, pcsEse: "373c", conventionalStatus: "04" },
  { firstName: "Julien", contract: "CDI", category: "AGENT_DE_MAITRISE", classificationCode: "ETAM_3.2", classificationLabel: "ETAM position 3.2, coefficient 450", salary: 3100, pasRate: 0.1, birthDate: "1996-09-08", sex: "1", birthPlace: "Arles", birthDepartment: "13", birthCommune: "004", address: { line: "11 rue Bigot", postalCode: "30000", city: "Nîmes" }, pcsEse: "478a", conventionalStatus: "05" },
  { firstName: "Léa", contract: "CDI", category: "EMPLOYE", classificationCode: "ETAM_1.1", classificationLabel: "ETAM position 1.1, coefficient 240", salary: 2050, pasRate: 0.03, birthDate: "1998-02-17", sex: "2", birthPlace: "Nîmes", birthDepartment: "30", birthCommune: "189", address: { line: "9 rue Porte de France", postalCode: "30900", city: "Nîmes" }, pcsEse: "542a", conventionalStatus: "06" },
  { firstName: "Sarah", contract: "CDI", category: "EMPLOYE", classificationCode: "ETAM_2.2", classificationLabel: "ETAM position 2.2, coefficient 310", salary: 2600, pasRate: 0.07, birthDate: "1987-07-25", sex: "2", birthPlace: "Béziers", birthDepartment: "34", birthCommune: "032", address: { line: "25 rue de la République", postalCode: "30900", city: "Nîmes" }, pcsEse: "543b", conventionalStatus: "06" },
  { firstName: "Sophie", contract: "CDD", category: "EMPLOYE", classificationCode: "ETAM_1.2", classificationLabel: "ETAM position 1.2, coefficient 250", salary: 2100, pasRate: 0.05, birthDate: "2000-12-05", sex: "2", birthPlace: "Nîmes", birthDepartment: "30", birthCommune: "189", address: { line: "14 rue Clérisseau", postalCode: "30000", city: "Nîmes" }, pcsEse: "543b", conventionalStatus: "06", fixedTermReason: "02" },
  { firstName: "Thomas", contract: "PROFESSIONNALISATION", category: "EMPLOYE", classificationCode: "ETAM_2.1", classificationLabel: "Contrat de professionnalisation, ETAM position 2.1", salary: 1950, pasRate: 0.03, birthDate: "2002-09-20", sex: "1", birthPlace: "Uzès", birthDepartment: "30", birthCommune: "334", address: { line: "6 rue des Arènes", postalCode: "30000", city: "Nîmes" }, pcsEse: "543g", conventionalStatus: "06", alternance: { contractYear: null, hasBaccalaureateOrHigher: true, preparedDiplomaLevel: null } },
  { firstName: "Hugo", contract: "CDD", category: "EMPLOYE", classificationCode: "ETAM_2.1", classificationLabel: "ETAM position 2.1, coefficient 275", salary: 2400, pasRate: 0.05, birthDate: "1995-04-02", sex: "1", birthPlace: "Nîmes", birthDepartment: "30", birthCommune: "189", address: { line: "30 avenue Feuchères", postalCode: "30000", city: "Nîmes" }, pcsEse: "543f", conventionalStatus: "06", fixedTermReason: "02" },
  { firstName: "Chloé", contract: "APPRENTISSAGE", category: "EMPLOYE", classificationCode: "ETAM_1.1", classificationLabel: "Apprentie, ETAM position 1.1", salary: 1750, pasRate: 0, birthDate: "2004-02-10", sex: "2", birthPlace: "Montpellier", birthDepartment: "34", birthCommune: "172", address: { line: "2 rue de la Curaterie", postalCode: "30000", city: "Nîmes" }, pcsEse: "543g", conventionalStatus: "06", alternance: { contractYear: 2, hasBaccalaureateOrHigher: null, preparedDiplomaLevel: "06" } },
  { firstName: "Inès", contract: "CDI", category: "EMPLOYE", classificationCode: "ETAM_2.3", classificationLabel: "ETAM position 2.3, coefficient 355", salary: 2700, pasRate: 0.07, birthDate: "1993-10-14", sex: "2", birthPlace: "Montpellier", birthDepartment: "34", birthCommune: "172", address: { line: "41 rue de Beaucaire", postalCode: "30000", city: "Nîmes" }, pcsEse: "543g", conventionalStatus: "06" },
  { firstName: "Maxime", contract: "CDD", category: "OUVRIER", classificationCode: "ETAM_1.1", classificationLabel: "ETAM position 1.1, coefficient 240", salary: 1950, pasRate: 0.03, birthDate: "1999-05-28", sex: "1", birthPlace: "Nîmes", birthDepartment: "30", birthCommune: "189", address: { line: "8 chemin du Mas de Vignoles", postalCode: "30900", city: "Nîmes" }, pcsEse: "653a", conventionalStatus: "07", fixedTermReason: "02" },
  { firstName: "Camille", contract: "CDI", category: "EMPLOYE", classificationCode: "ETAM_1.2", classificationLabel: "ETAM position 1.2, coefficient 250", salary: 2350, pasRate: 0.05, birthDate: "1992-08-19", sex: "2", birthPlace: "Nîmes", birthDepartment: "30", birthCommune: "189", address: { line: "16 rue Notre-Dame", postalCode: "30000", city: "Nîmes" }, pcsEse: "543f", conventionalStatus: "06" },
];

/** Effectif retenu pour les seuils (moyenne fictive de l'année précédente, hors alternants). */
export const DEMO_HEADCOUNT = 9;
/** SIRET fictif à clé valide, utilisé seulement si l'organisation de démonstration n'a pas de SIRET valide. */
export const DEMO_SIRET = "99999999800019";
export const DEMO_MONTHLY_HOURS = 151.67;
export const DEMO_ATMP_RATE_PERCENT = 1;
export const DEMO_HEALTH_PLAN = { monthlyAmount: 30, employerSharePercent: 50 } as const;
/** Prévoyance des cadres : minimum conventionnel de 1,50 % de la tranche 1 à la charge de l'employeur. */
export const DEMO_PREVOYANCE_RATES = { cadre: { employeeT1: 0, employerT1: 0.015, employeeT2: 0, employerT2: 0 } } as const;
/** Organismes et comptes fictifs (formats valides, jamais transmis). */
export const DEMO_DSN_SETTINGS = {
  contactName: "Service paie",
  contactEmail: "paie.demo@example.com",
  contactPhone: "0466000000",
  declaredContactType: "04",
  urssafSiret: "75366412700077",
  retirementSiret: "44832375800038",
  iban: "FR7630006000011234567890189",
  bic: "AGRIFRPPXXX",
  complementaryOrganism: "P0983",
  workAccidentRiskCode: "723ZA",
} as const;

export const DEMO_SOURCE = "DGFIP";
export const DEMO_SOURCE_REFERENCE_PREFIX = "RH-PILOT-DEMO";

const pad = (value: number) => String(value).padStart(2, "0");
const iso = (date: Date) => date.toISOString().slice(0, 10);

export function demoPayrollEmployee(firstName: string): DemoPayrollEmployee | null {
  return DEMO_PAYROLL_EMPLOYEES.find((employee) => employee.firstName === firstName) ?? null;
}

/** NIR fictif sur 13 caractères, cohérent avec le sexe, la date et le lieu de naissance. */
export function demoNir(employee: DemoPayrollEmployee, index: number): string {
  return `${employee.sex}${employee.birthDate.slice(2, 4)}${employee.birthDate.slice(5, 7)}${employee.birthDepartment}${employee.birthCommune}${String(101 + index).padStart(3, "0")}`;
}

/** Identifiant de taux PAS fictif, au format numérique attendu en DSN. */
export function demoPasRateIdentifier(index: number): string {
  return String(900000000001 + index);
}

function lastDayOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 0));
}

function addMonthsMinusOneDay(day: string, months: number): Date {
  const [year, month, date] = day.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, date));
  target.setUTCDate(target.getUTCDate() - 1);
  return target;
}

/** Dernier jour ouvré du mois : date de paiement de la période de démonstration. */
export function demoPaymentDate(year: number, month: number): Date {
  const day = lastDayOfMonth(year, month);
  while (day.getUTCDay() === 0 || day.getUTCDay() === 6) day.setUTCDate(day.getUTCDate() - 1);
  return day;
}

/**
 * Fin prévisionnelle des contrats à durée déterminée : douze mois pour un CDD ou une
 * professionnalisation, deux ans pour un apprentissage, et jamais avant la fin du
 * mois qui suit le mois de paie (la démonstration ne commence pas par une sortie).
 */
export function demoContractEndDate(contract: ContractKind, hireDate: string, periodYear: number, periodMonth: number): Date | null {
  if (contract === "CDI") return null;
  const end = addMonthsMinusOneDay(hireDate, contract === "APPRENTISSAGE" ? 24 : 12);
  const earliest = lastDayOfMonth(periodYear, periodMonth + 1);
  return end < earliest ? earliest : end;
}

/** Mois de paie couverts par la reprise : de janvier (ou de l'embauche) à la fin du mois précédent. */
export function demoOpeningMonths(hireDate: string, year: number, month: number): number[] {
  const hireYear = Number(hireDate.slice(0, 4));
  const hireMonth = Number(hireDate.slice(5, 7));
  if (hireYear > year || (hireYear === year && hireMonth >= month)) return [];
  const first = hireYear < year ? 1 : hireMonth;
  return Array.from({ length: month - first }, (_, index) => first + index);
}

export type DemoOrganizationContext = Pick<OrganizationPayrollContext, "atmpRatePercent" | "healthPlan" | "prevoyance" | "ijssSubrogation" | "paidLeaveMethod" | "workedSolidarityDay">;

export type DemoOpening = { throughMonth: number; cumuls: YearToDate & { rgduUrssafAmount: number }; bulletins: PayslipResult[] };

/**
 * Cumuls de l'année arrêtés à la fin du mois précédent, calculés par le moteur de
 * bulletin mois après mois (salaire constant, sans absence ni variable). La part
 * Urssaf de la RGDU suit la ventilation des DSN mensuelles (CTP 668 / retraite).
 */
export function computeDemoOpening(input: {
  employee: DemoPayrollEmployee;
  employeeId: string;
  displayName: string;
  hireDate: string;
  contractEndDate: string | null;
  year: number;
  month: number;
  organization: DemoOrganizationContext;
  headcount: number;
  rateIdentifier: string;
}): DemoOpening | null {
  const months = demoOpeningMonths(input.hireDate, input.year, input.month);
  if (months.length === 0) return null;
  let yearToDate: YearToDate | null = null;
  const bulletins: PayslipResult[] = [];
  for (const month of months) {
    const result = computePayslip({
      period: { year: input.year, month },
      paymentDate: iso(demoPaymentDate(input.year, month)),
      organization: { ...input.organization, headcount: input.headcount, mobilityRatePercent: 0, territory: "METROPOLE", alsaceMoselle: false },
      employee: {
        id: input.employeeId, displayName: input.displayName, contract: input.employee.contract, executive: input.employee.category === "CADRE",
        hireDate: input.hireDate, contractEndDate: input.contractEndDate, seniorityDate: null,
        plannedContractDays: input.employee.contract === "CDD" && input.contractEndDate ? daysBetweenInclusive(input.hireDate, input.contractEndDate) : null,
      },
      pay: { monthlyBaseSalary: input.employee.salary, contractMonthlyHours: DEMO_MONTHLY_HOURS, schedule: FULL_TIME_SCHEDULE },
      yearToDate,
      withholding: { mode: "PERSONALIZED", rate: input.employee.pasRate, rateIdentifier: input.rateIdentifier },
    });
    yearToDate = result.yearToDate;
    bulletins.push(result);
  }
  const cumuls = { ...yearToDate!, rgduUrssafAmount: Math.round(yearToDate!.rgduAmount * rgduUrssafFraction(input.headcount) * 100) / 100 };
  return { throughMonth: months[months.length - 1], cumuls, bulletins };
}

function monthIndex(year: number, month: number): number {
  return year * 12 + month - 1;
}

/** Mois de présence entre deux bornes (le mois d'embauche compte si l'embauche a lieu au plus tard le 15). */
function monthsPresent(hireDate: string, fromYear: number, fromMonth: number, toYear: number, toMonth: number): number {
  const hireYear = Number(hireDate.slice(0, 4));
  const hireMonth = Number(hireDate.slice(5, 7));
  const hireDay = Number(hireDate.slice(8, 10));
  const firstCounted = monthIndex(hireYear, hireMonth) + (hireDay > 15 ? 1 : 0);
  const start = Math.max(monthIndex(fromYear, fromMonth), firstCounted);
  const end = monthIndex(toYear, toMonth);
  return Math.max(0, end - start + 1);
}

/**
 * Compteurs de congés payés au début du mois de paie (jours ouvrables) : N acquis
 * depuis le 1er juin, N-1 acquis sur la période précédente et en partie pris l'été.
 */
export function demoPaidLeaveOpening(employee: DemoPayrollEmployee, hireDate: string, year: number, month: number): PaidLeaveBalances | null {
  if (hireDate >= `${year}-${pad(month)}-01`) return null;
  const reference = paidLeaveReferenceYear(year, month);
  const previousMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const currentMonths = Math.min(12, monthsPresent(hireDate, reference, 6, previousMonth.year, previousMonth.month));
  const previousMonths = Math.min(12, monthsPresent(hireDate, reference - 1, 6, reference, 5));
  const previousAcquired = Math.min(30, Math.ceil(previousMonths * 2.5));
  // Au début de l'été, les congés N-1 sont encore à prendre ; à partir de septembre, l'essentiel est pris.
  const previousTaken = month >= 9 || month <= 5 ? Math.min(previousAcquired, Math.round(previousAcquired * 0.6)) : 0;
  return {
    previousAcquired,
    previousTaken,
    currentAcquired: Math.min(30, currentMonths * 2.5),
    currentTaken: 0,
    referenceGross: previousMonths > 0 ? Math.round(employee.salary * previousMonths * 100) / 100 : null,
    referenceAcquiredDays: previousMonths > 0 ? previousAcquired : null,
    currentReferenceGross: Math.round(employee.salary * currentMonths * 100) / 100,
  };
}

/** Affiliations santé (tous) et prévoyance (cadres), contrats fictifs. */
export function demoComplementaryAffiliations(employee: DemoPayrollEmployee, hireDate: string, year: number) {
  const validFrom = hireDate > `${year}-01-01` ? hireDate : `${year}-01-01`;
  const common = { organismCode: DEMO_DSN_SETTINGS.complementaryOrganism, delegateCode: null, populationCode: null, optionCode: null, validFrom, validUntil: null, paymentFrequency: "MONTHLY" as const };
  return [
    { coverage: "SANTE" as const, contractReference: "DEMO-SANTE-01", componentCodes: ["20"], sourceReference: "Fiche de paramétrage fictive (démonstration RH Pilot)", ...common },
    ...(employee.category === "CADRE" ? [{ coverage: "PREVOYANCE" as const, contractReference: "DEMO-PREVOYANCE-01", componentCodes: ["11", "24"], sourceReference: "Fiche de paramétrage fictive (démonstration RH Pilot)", ...common }] : []),
  ];
}

/** Dispositif DSN de l'alternant : 64 sous 11 salariés, 65 au-delà ; 61 pour la professionnalisation. */
export function demoPublicPolicy(employee: DemoPayrollEmployee, headcount: number): string {
  if (employee.contract === "APPRENTISSAGE") return headcount >= 11 ? "65" : "64";
  if (employee.contract === "PROFESSIONNALISATION") return "61";
  return "99";
}

/** Profil DSN fictif du salarié (hors NIR chiffré), cohérent avec son contrat et le SIRET de l'établissement. */
export function demoDsnProfileFields(input: { employee: DemoPayrollEmployee; index: number; hireDate: string; contractEndDate: Date | null; siret: string; year: number; headcount: number }) {
  const { employee } = input;
  return {
    birthDate: new Date(`${employee.birthDate}T00:00:00.000Z`), birthPlace: employee.birthPlace, birthDepartment: employee.birthDepartment,
    birthCountryCode: "FR", euClassificationCode: "01",
    addressLine: employee.address.line, postalCode: employee.address.postalCode, city: employee.address.city, countryCode: null,
    contractNumber: `DEMO-${String(input.index + 1).padStart(3, "0")}`,
    contractNatureCode: input.contractEndDate ? "02" : "01",
    fixedTermReasonCode: employee.contract === "CDD" ? employee.fixedTermReason ?? "02" : null,
    publicPolicyCode: demoPublicPolicy(employee, input.headcount),
    preparedDiplomaLevel: employee.contract === "APPRENTISSAGE" ? employee.alternance?.preparedDiplomaLevel ?? null : null,
    pcsEsecCode: employee.pcsEse.toUpperCase(), conventionalStatusCode: employee.conventionalStatus,
    retirementStatusCode: employee.category === "CADRE" ? "01" : "04",
    workUnitCode: "10", referenceWorkQuota: DEMO_MONTHLY_HOURS, contractWorkQuota: DEMO_MONTHLY_HOURS, workModalityCode: "10",
    baseSchemeSupplementCode: "99", sicknessRegimeCode: "200", workLocationId: input.siret, oldAgeRegimeCode: "200",
    foreignWorkerCode: "99", employmentStatusCode: "99", multipleJobsCode: "01", multipleEmployersCode: "01",
    workAccidentRegimeCode: "200", workAccidentRiskCode: DEMO_DSN_SETTINGS.workAccidentRiskCode,
    complementaryAffiliations: normalizeDsnComplementaryAffiliations(demoComplementaryAffiliations(employee, input.hireDate, input.year)),
  };
}
