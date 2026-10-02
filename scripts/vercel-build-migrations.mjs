import { spawnSync } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { runWithConnectionRetry } from "./vercel-migration-policy.mjs";

const RECOVERABLE_FAILED_MIGRATIONS = [
  "20260811190209_add_diagnostic_response",
  "20260906130000_paie_foundation",
  "20260906195500_align_payroll_columns_with_prisma",
  "20260907220000_seed_publicodes_payroll_rule",
  "20260908230000_add_payroll_ledger",
  "20260911190000_add_missing_employee_and_org_columns",
  "20260915224500_cascade_payroll_contributions_with_calculation",
];

function runCapture(args) {
  const result = spawnSync("npx", ["prisma", ...args], {
    encoding: "utf8",
    shell: true,
  });

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (output) process.stdout.write(output);

  return {
    status: result.status ?? 1,
    output,
  };
}

// Les migrations ne tournent que pour le déploiement de production. Une prévisualisation
// (branche non fusionnée) qui partagerait la base de production la modifierait sinon.
// ALLOW_PREVIEW_MIGRATIONS=true les autorise pour une base de prévisualisation distincte.
const vercelEnv = process.env.VERCEL_ENV;
if (vercelEnv && vercelEnv !== "production" && process.env.ALLOW_PREVIEW_MIGRATIONS !== "true") {
  console.log(`Déploiement ${vercelEnv} : migrations ignorées (réservées à la production).`);
  process.exit(0);
}

let result = await runWithConnectionRetry(() => runCapture(["migrate", "deploy"]), setTimeout);

if (result.status !== 0) {
  const failedMigration = RECOVERABLE_FAILED_MIGRATIONS.find((migration) =>
    result.output.includes(migration)
  );

  const hasRecoverableMigrationError =
    result.output.includes("P3009") || result.output.includes("P3018");

  if (!hasRecoverableMigrationError || !failedMigration) {
    process.exit(result.status);
  }

  console.warn(
    `Prisma a détecté la migration bloquée ${failedMigration}. Elle est marquée rolled-back puis relancée.`
  );

  const resolve = runCapture([
    "migrate",
    "resolve",
    "--rolled-back",
    failedMigration,
  ]);

  if (resolve.status !== 0) {
    process.exit(resolve.status);
  }

  result = await runWithConnectionRetry(() => runCapture(["migrate", "deploy"]), setTimeout);
}

process.exit(result.status);
