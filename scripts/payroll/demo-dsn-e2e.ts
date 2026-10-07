/**
 * Produit les DSN de la paie de démonstration (deux mois) pour les soumettre à Dsn-Val.
 * Usage : DATABASE_URL=… node --import tsx scripts/payroll/demo-dsn-e2e.ts <dossier>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { prisma } from "../../src/lib/prisma";
import { runDemoPayrollScenario } from "./demo-payroll-scenario";

const directory = resolve(process.argv[2] ?? "demo-dsn");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL est nécessaire : le parcours de démonstration s'exécute sur une base PostgreSQL migrée.");

async function main(): Promise<void> {
  mkdirSync(directory, { recursive: true });
  const result = await runDemoPayrollScenario();
  for (const month of result.months) {
    const name = `demo-${month.year}-${String(month.month).padStart(2, "0")}.txt`;
    writeFileSync(join(directory, name), month.content, "utf8");
    console.log(`DSN de démonstration ${month.month}/${month.year} : ${month.employeeCount} salariés, ${month.warnings.length} avertissement(s) de calcul.`);
    for (const warning of month.warnings) console.log(`  · ${warning}`);
  }
}

main().finally(() => prisma.$disconnect()).catch((error) => {
  console.error(error);
  if (process.env.GITHUB_ACTIONS) console.log(`::error title=Paie de démonstration::${String(error instanceof Error ? error.message : error).replace(/\n/g, "%0A")}`);
  process.exit(1);
});
