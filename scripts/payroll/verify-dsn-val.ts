import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildDsnP26V01Complete } from "../../src/lib/payroll/dsn-p26v01-complete";
import { buildDsnP26V01Monthly } from "../../src/lib/payroll/dsn-p26v01";
import { assertDsnValReportAccepted } from "../../src/lib/payroll/dsn-val-report";
import { mappedDsnFixture } from "./dsn-fixture";
import { computedDsnFixture } from "./dsn-computed-fixture";

const validatorDirectory = process.env.DSN_VAL_DIR;
if (!validatorDirectory) throw new Error("Définissez DSN_VAL_DIR vers Dsn-Val Linux 64 bits 2026.1.0.17.");
const validator = resolve(validatorDirectory, "Autocontrol-ValidateurModeBatchLinux64.sh");
const output = mkdtempSync(join(tmpdir(), "rhpilot-dsn-val-"));
function validate(name: string, content: string): string {
  const path = join(output, `${name}.dsn`);
  writeFileSync(path, content, { encoding: "latin1", mode: 0o600 });
  execFileSync("bash", [validator, "-nc", "-l", "200", "-o", output, path], { stdio: "pipe", timeout: 120_000 });
  const xml = readFileSync(`${path}.xml`, "utf8");
  if (!xml.includes("Version : 2026.1.0.17")) throw new Error("La version de Dsn-Val diffère de celle validée dans le projet.");
  return xml;
}

const single = mappedDsnFixture();
const content = buildDsnP26V01Complete(single);
assertDsnValReportAccepted(validate("precontrole-identite-pas", buildDsnP26V01Monthly(single)));
assertDsnValReportAccepted(validate("salarie-unique", content));
const multiple = mappedDsnFixture();
const secondNir = "2860875123456";
multiple.employees.push({ ...multiple.employees[0], nir: secondNir, lastName: "MARTIN", firstName: "Lea" });
multiple.assessedBases.push(...single.assessedBases.map((base) => ({ ...base, employeeNir: secondNir })));
multiple.contributionBordereau.individualContributions.push(...single.contributionBordereau.individualContributions.map((contribution) => ({ ...contribution, employeeNir: secondNir })));
multiple.contributionBordereau.totalAmount *= 2;
multiple.contributionBordereau.aggregatedContributions = single.contributionBordereau.aggregatedContributions.map((aggregate) => ({ ...aggregate, payableAmount: aggregate.payableAmount * 2, ...(aggregate.baseAmount === undefined ? {} : { baseAmount: aggregate.baseAmount! * 2 }), ...(aggregate.contributionAmount === undefined ? {} : { contributionAmount: aggregate.contributionAmount! * 2 }) }));
multiple.payments[0].amount *= 2;
assertDsnValReportAccepted(validate("plusieurs-salaries", buildDsnP26V01Complete(multiple)));

for (const [label, gross, hours] of [["bulletin-2500", 2500, 151.67], ["bulletin-6000", 6000, 151.67], ["bulletin-temps-partiel", 1800, 121.33]] as const) {
  const report = validate(label, buildDsnP26V01Complete(computedDsnFixture(gross, hours)));
  try { assertDsnValReportAccepted(report); } catch (error) {
    console.error("Rapport du cas synthétique refusé :", label, report);
    throw error;
  }
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

// Témoin négatif : l'outil doit réellement détecter un bloc obligatoire supprimé.
const rejected = validate("temoin-invalide", content.replace(/^S21\.G00\.71\.002,.*\r\n/m, ""));
let rejectedAsExpected = false;
try { assertDsnValReportAccepted(rejected); } catch { rejectedAsExpected = true; }
if (!rejectedAsExpected) throw new Error("Dsn-Val n'a pas rejeté le témoin invalide.");
console.log("Dsn-Val 2026.1.0.17 : neuf fixtures P26V01 acceptées, dont six calculées par le moteur, sans anomalie ; témoin invalide refusé.");
console.log(`Rapports : ${output}`);
