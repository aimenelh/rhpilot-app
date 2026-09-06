import { spawnSync } from "node:child_process";

const FAILED_MIGRATION = "20260811190209_add_diagnostic_response";

function run(args) {
  const result = spawnSync("npx", ["prisma", ...args], {
    stdio: "inherit",
    shell: true,
  });

  if (result.error) throw result.error;
  return result.status ?? 1;
}

let status = run(["migrate", "deploy"]);

if (status !== 0) {
  console.warn(
    `Prisma migrate deploy failed. Resolving only the known failed migration ${FAILED_MIGRATION} and retrying.`
  );

  const resolveStatus = run([
    "migrate",
    "resolve",
    "--rolled-back",
    FAILED_MIGRATION,
  ]);

  if (resolveStatus !== 0) {
    process.exit(resolveStatus);
  }

  status = run(["migrate", "deploy"]);
}

process.exit(status);
