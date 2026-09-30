import table from "./dsn-urssaf-dida-p26.json";
import type { DsnAggregatedContribution, DsnIndividualContribution } from "./dsn-p26v01-complete";

export const URSSAF_DIDA_SOURCE = table.source;
export const URSSAF_DIDA_VERSION = `DIDA-${table.retrievedOn}-${table.sourceSha256.slice(0, 12)}`;

/** Valide la forme déclarative ; les taux/montants viennent du bulletin, pas de DIDA. */
export function assertUrssafAggregateMapping(aggregate: DsnAggregatedContribution): void {
  const mappings = table.rows.filter((row) => row.ctp === aggregate.code && row.baseQualifier === aggregate.baseQualifier);
  if (!mappings.length) throw new Error(`DSN bloquée : correspondance officielle Urssaf absente pour le CTP ${aggregate.code}/${aggregate.baseQualifier}.`);
  const fields = [
    ["aggregateRate", aggregate.ratePercent, "taux"],
    ["aggregateBase", aggregate.baseAmount, "assiette"],
    ["aggregateAmount", aggregate.contributionAmount, "montant de cotisation"],
    ["aggregateCommune", aggregate.inseeCommuneCode, "commune"],
  ] as const;
  for (const [flag, value, label] of fields) {
    const present = value !== undefined && value !== null && value !== "";
    const required = mappings.some((row) => row[flag]);
    if (present !== required) throw new Error(`DSN bloquée : ${label} ${required ? "obligatoire" : "interdit"} pour le CTP ${aggregate.code}/${aggregate.baseQualifier} (table DIDA).`);
  }
}

export function assertUrssafIndividualMapping(contribution: DsnIndividualContribution, aggregates: readonly DsnAggregatedContribution[]): void {
  const allowed = table.rows.some((row) => row.individualCode === contribution.code && row.baseCode === contribution.baseCode && aggregates.some((aggregate) => aggregate.code === row.ctp && aggregate.baseQualifier === row.baseQualifier));
  if (!allowed) throw new Error(`DSN bloquée : la cotisation Urssaf ${contribution.code} sous la base ${contribution.baseCode} n'a pas de correspondance avec les CTP déclarés.`);
}
