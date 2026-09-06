import { spawnSync } from "node:child_process";

const RECOVERABLE_FAILED_MIGRATIONS = [
  "20260811190209_add_diagnostic_response",
  "20260906130000_paie_foundation",
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

let result = runCapture(["migrate", "deploy"]);

if (result.status !== 0) {
  const failedMigration = RECOVERABLE_FAILED_MIGRATIONS.find((migration) =>
    result.output.includes(migration)
  );

  if (!result.output.includes("P3009") || !failedMigration) {
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

  result = runCapture(["migrate", "deploy"]);
}

process.exit(result.status);
