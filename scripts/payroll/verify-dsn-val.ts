import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildDsnP26V01Complete } from "../../src/lib/payroll/dsn-p26v01-complete";
import { buildDsnP26V01Monthly } from "../../src/lib/payroll/dsn-p26v01";
import { assertDsnValReportAccepted } from "../../src/lib/payroll/dsn-val-report";
import { mappedDsnFixture } from "./dsn-fixture";
import { computedDsnFixture } from "./dsn-computed-fixture";
import { buildDsnP26WorkEvent } from "../../src/lib/payroll/dsn-work-event";
import { workEventFixture } from "./dsn-work-event-fixture";

const validatorDirectory = process.env.DSN_VAL_DIR;
if (!validatorDirectory) throw new Error("Définissez DSN_VAL_DIR vers Dsn-Val Linux 64 bits 2026.1.0.17.");
const validator = resolve(validatorDirectory, "Autocontrol-ValidateurModeBatchLinux64.sh");
const output = mkdtempSync(join(tmpdir(), "rhpilot-dsn-val-"));
let acceptedCount = 0;
function validate(name: string, content: string): string {
  const path = join(output, `${name}.dsn`);
  writeFileSync(path, content, { encoding: "latin1", mode: 0o600 });
  // Un espace Eclipse distinct évite les conflits de projet autoctrlprj entre validations.
  execFileSync("bash", [validator, "-data", join(output, `workspace-${name}`), "-nc", "-l", "200", "-o", output, path], { stdio: "pipe", timeout: 120_000 });
  const xml = readFileSync(`${path}.xml`, "utf8");
  if (!xml.includes("Version : 2026.1.0.17")) throw new Error("La version de Dsn-Val diffère de celle validée dans le projet.");
  return xml;
}
/** Les journaux CI ne sont pas toujours consultables : les anomalies remontent aussi en annotations GitHub. */
function annotate(name: string, report: string): void {
  if (!process.env.GITHUB_ACTIONS) return;
  const text = report.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const anomalies = [...text.matchAll(/S2\d\.G00\.\d\d\.\d{3}\/(?:CCH|SIG|CSL|CRE)-\d+.{0,400}/g)].map((match) => match[0]).slice(0, 6);
  const body = (anomalies.length > 0 ? anomalies.join(" | ") : text.slice(0, 1500)).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
  console.log(`::error title=Dsn-Val ${name}::${body}`);
}
function accept(name: string, content: string): void {
  const report = validate(name, content);
  try { assertDsnValReportAccepted(report); } catch (error) { console.error("Rapport synthétique refusé :", name, report); annotate(name, report); throw error; }
  acceptedCount += 1;
  console.log(`Dsn-Val : ${name} accepté.`);
}

const single = mappedDsnFixture();
for (const gross of [2500, 6000]) {
  const cdd = computedDsnFixture(gross, 151.67, false, undefined, false, {
  employee: { id: "employee-test", displayName: "CDD Test", contract: "CDD", executive: false, hireDate: "2026-01-01", contractEndDate: "2026-02-15", plannedContractDays: 46 }, withholding: { mode: "DEFAULT_GRID" },
  });
  cdd.employees[0].contract.fixedTermReasonCode = "01"; // Cas synthétique : remplacement déclaré explicitement.
  accept(`bulletin-cdd-court-pas-neutre-${gross}`, buildDsnP26V01Complete(cdd));
}
for (const reason of ["01", "02", "03", "06"] as const) {
  for (const subrogation of [false, true]) accept(`signalement-arret-${reason}-${subrogation ? "subroge" : "direct"}`, buildDsnP26WorkEvent(workEventFixture(reason, subrogation)));
}
accept("signalement-reprise-maladie", buildDsnP26WorkEvent(workEventFixture("01", false, "05")));
accept("signalement-reprise-at-subroge", buildDsnP26WorkEvent(workEventFixture("06", true, "05")));
const content = buildDsnP26V01Complete(single);
accept("precontrole-identite-pas", buildDsnP26V01Monthly(single));
accept("salarie-unique", content);
const multiple = mappedDsnFixture();
const secondNir = "2860875123456";
multiple.employees.push({ ...multiple.employees[0], nir: secondNir, lastName: "MARTIN", firstName: "Lea" });
multiple.assessedBases.push(...single.assessedBases.map((base) => ({ ...base, employeeNir: secondNir })));
multiple.contributionBordereau.individualContributions.push(...single.contributionBordereau.individualContributions.map((contribution) => ({ ...contribution, employeeNir: secondNir })));
multiple.contributionBordereau.totalAmount *= 2;
multiple.contributionBordereau.aggregatedContributions = single.contributionBordereau.aggregatedContributions.map((aggregate) => ({ ...aggregate, payableAmount: aggregate.payableAmount * 2, ...(aggregate.baseAmount === undefined ? {} : { baseAmount: aggregate.baseAmount! * 2 }), ...(aggregate.contributionAmount === undefined ? {} : { contributionAmount: aggregate.contributionAmount! * 2 }) }));
multiple.payments[0].amount *= 2;
accept("plusieurs-salaries", buildDsnP26V01Complete(multiple));

for (const [label, gross, hours] of [["bulletin-2500", 2500, 151.67], ["bulletin-6000", 6000, 151.67], ["bulletin-temps-partiel", 1800, 121.33]] as const) {
  accept(label, buildDsnP26V01Complete(computedDsnFixture(gross, hours)));
}

const complementaryReport = validate("bulletin-complementaires", buildDsnP26V01Complete(computedDsnFixture(6000, 151.67, true)));
try { assertDsnValReportAccepted(complementaryReport); } catch (error) { console.error("Rapport synthétique complémentaire :", complementaryReport); throw error; }

const mobilityReport = validate("bulletin-forfait-social-mobilite", buildDsnP26V01Complete(computedDsnFixture(2500, 151.67, true, {
  headcount: 15, mobilityRatePercent: 1.85,
  mobilityDsn: { source: "URSSAF", communeCode: "75101", validFrom: "2026-01-01", validUntil: null, components: { vm: 1.2, vma: 0.5, vmr: 0.15 } },
})));
try { assertDsnValReportAccepted(mobilityReport); } catch (error) { console.error("Rapport synthétique forfait/mobilité :", mobilityReport); throw error; }

const executiveReport = validate("bulletin-cadre-seuil-50", buildDsnP26V01Complete(computedDsnFixture(3000, 151.67, true, { headcount: 50 }, true)));
try { assertDsnValReportAccepted(executiveReport); } catch (error) { console.error("Rapport synthétique cadre/FNAL :", executiveReport); throw error; }
acceptedCount += 3;

accept("bulletin-39h", buildDsnP26V01Complete(computedDsnFixture(3000, 169, false, undefined, false, {
  pay: { monthlyBaseSalary: 3000, contractMonthlyHours: 169, structuralOvertimeMonthlyHours: 17.33, structuralOvertimeRate: 0.25, schedule: [7.8, 7.8, 7.8, 7.8, 7.8, 0, 0] },
})));
accept("bulletin-hs", buildDsnP26V01Complete(computedDsnFixture(2500, 151.67, false, undefined, false, { overtime: { hoursFirstBand: 5 } })));
accept("bulletin-hc", buildDsnP26V01Complete(computedDsnFixture(1800, 121.33, false, undefined, false, { complementaryHours: { hoursWithinTenth: 4 } })));
accept("bulletin-sans-solde", buildDsnP26V01Complete(computedDsnFixture(2500, 151.67, false, undefined, false, {
  absences: [{ id: "unpaid", kind: "UNPAID_LEAVE", start: "2026-01-12", end: "2026-01-16" }],
})));
for (const kind of ["SICK_LEAVE", "WORK_ACCIDENT", "MATERNITY", "PATERNITY"] as const) {
  const accident = kind === "WORK_ACCIDENT" ? { workAccidentDate: "2026-01-12" } : {};
  for (const subrogation of [false, true]) {
    accept(`bulletin-${kind}-${subrogation ? "subrogation" : "direct"}`, buildDsnP26V01Complete(computedDsnFixture(2500, 151.67, false,
      { ijssSubrogation: subrogation }, false,
      { absences: [{ id: "stoppage", kind, start: "2026-01-12", end: "2026-01-16", ijssGrossAmount: 100 }] },
      { stoppage: { ...accident, ...(subrogation ? { subrogationStartDate: "2026-01-12", subrogationEndDate: "2026-01-16" } : {}) } },
    )));
  }
}

for (const referenceGross of [12000, 60000]) {
  accept(`bulletin-cp-${referenceGross === 12000 ? "maintien" : "dixieme"}`, buildDsnP26V01Complete(computedDsnFixture(2500, 151.67, false, undefined, false, {
    absences: [{ id: "cp", kind: "PAID_LEAVE", start: "2026-01-12", end: "2026-01-16" }],
    paidLeave: { previousAcquired: 30, previousTaken: 0, currentAcquired: 0, currentTaken: 0, referenceGross, referenceAcquiredDays: 30 },
  })));
}
const ordinaryEmployee = { id: "employee-test", displayName: "Maxime Dupont", contract: "CDI" as const, executive: false, hireDate: "2026-01-12" };
accept("bulletin-reprise-premier-fevrier", buildDsnP26V01Complete(computedDsnFixture(2500, 151.67, false,
  { ijssSubrogation: false }, false, { period: { year: 2026, month: 2 }, absences: [{ id: "previous-stoppage", kind: "SICK_LEAVE", start: "2026-01-20", end: "2026-01-31" }] },
  { "previous-stoppage": { returnDate: "2026-02-01", returnReasonCode: "01" } },
)));
accept("bulletin-entree-12-janvier", buildDsnP26V01Complete(computedDsnFixture(2500, 151.67, false, undefined, false, { employee: ordinaryEmployee })));
accept("bulletin-droits-chomage-18000", buildDsnP26V01Complete(computedDsnFixture(18000)));

// Apprentis : part exonérée en CTP 726, surplus au régime général, chômage en CTP 423, exonération Agirc-Arrco 109.
const apprenticeEmployee = (hireDate: string) => ({ id: "employee-test", displayName: "Lina Apprentie", contract: "APPRENTISSAGE" as const, executive: false, hireDate, contractEndDate: "2027-08-31" });
accept("bulletin-apprenti-50-smic", buildDsnP26V01Complete(computedDsnFixture(1100, 151.67, false, undefined, false, { employee: apprenticeEmployee("2025-09-01") })));
accept("bulletin-apprenti-79-smic-sous-seuil", buildDsnP26V01Complete(computedDsnFixture(1300, 151.67, false, undefined, false, { employee: apprenticeEmployee("2024-09-01") })));
accept("bulletin-apprenti-loi-1987", buildDsnP26V01Complete(computedDsnFixture(1500, 151.67, false, { headcount: 15 }, false, { employee: apprenticeEmployee("2025-09-01") })));

// Autres éléments de revenu brut : titres-restaurant, transport public, avantage véhicule, frais au réel et au forfait, FMD.
accept("bulletin-titres-transport-avantages-frais", buildDsnP26V01Complete(computedDsnFixture(2500, 151.67, false, undefined, false, {
  mealVouchers: { count: 20, faceValue: 13, employerShare: 0.6 },
  publicTransport: { monthlySubscription: 90.8, employerShare: 0.5 },
  benefitsInKind: [{ code: "BENEFIT_VEHICLE", label: "Avantage en nature véhicule", amount: 180 }, { code: "BENEFIT_MEAL", label: "Avantage en nature nourriture", amount: 105 }],
  expenses: [{ code: "EXPENSE_REAL", label: "Frais sur justificatifs", amount: 42.5 }, { code: "EXPENSE_KILOMETRIC", label: "Indemnités kilométriques", amount: 60 }, { code: "SUSTAINABLE_MOBILITY", label: "Forfait mobilités durables", amount: 25 }],
})));

// Primes non mensuelles : 13e mois rattaché à l'année écoulée, prime exceptionnelle, prime non liée à l'activité.
accept("bulletin-13e-mois", buildDsnP26V01Complete(computedDsnFixture(2500, 151.67, false, undefined, false, {
  bonuses: [{ code: "YEAR_END_BONUS", label: "13e mois", amount: 2500, excludedFromPaidLeaveBase: true, dsn: { type: "027", attachmentStart: "2025-01-01", attachmentEnd: "2025-12-31" } }],
})));
accept("bulletin-primes-026-028", buildDsnP26V01Complete(computedDsnFixture(2500, 151.67, false, undefined, false, {
  bonuses: [
    { code: "EXCEPTIONAL_BONUS", label: "Prime exceptionnelle", amount: 400, excludedFromPaidLeaveBase: true, dsn: { type: "026", attachmentStart: "2025-10-01", attachmentEnd: "2025-12-31" } },
    { code: "VACATION_BONUS", label: "Prime de naissance", amount: 150, excludedFromPaidLeaveBase: true, dsn: { type: "028", attachmentStart: null, attachmentEnd: null } },
  ],
})));

// Témoin négatif : l'outil doit réellement détecter un bloc obligatoire supprimé.
const rejected = validate("temoin-invalide", content.replace(/^S21\.G00\.71\.002,.*\r\n/m, ""));
let rejectedAsExpected = false;
try { assertDsnValReportAccepted(rejected); } catch { rejectedAsExpected = true; }
if (!rejectedAsExpected) throw new Error("Dsn-Val n'a pas rejeté le témoin invalide.");
console.log(`Dsn-Val 2026.1.0.17 : ${acceptedCount} fixtures P26V01 acceptées sans anomalie ; témoin invalide refusé.`);
console.log(`Rapports : ${output}`);
