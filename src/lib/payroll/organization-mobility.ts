/**
 * Taux de versement mobilité retenu pour une période de paie.
 *
 * Ordre de priorité :
 * 1. un taux saisi à la main par l'entreprise (source MANUEL) ;
 * 2. le barème Urssaf de la commune de l'établissement, à la date de la paie ;
 * 3. à défaut de réponse de l'Urssaf, le dernier taux du barème mémorisé.
 * Le calcul n'est bloqué que si aucun de ces trois taux n'est disponible,
 * et seulement pour une entreprise d'au moins 11 salariés.
 */
import { prisma } from "@/lib/prisma";
import { lookupCommuneCode } from "@/lib/company-registry";
import { describeMobilityRate, fetchMobilityRate } from "./mobility-rate";

type MobilityRow = {
  mobilityRate: unknown;
  mobilityRateSource: string | null;
  mobilityRateCheckedAt: Date | null;
  payrollCommuneCode: string | null;
  payrollCity: string | null;
  payrollPostalCode: string | null;
};

const frDay = (date: Date) => date.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });

export async function resolvePeriodMobilityRate(input: { organizationId: string; periodFirstDay: string; headcount: number }): Promise<{ ratePercent: number; warning: string | null }> {
  if (input.headcount < 11) return { ratePercent: 0, warning: null };

  const rows = await prisma.$queryRaw<MobilityRow[]>`
    SELECT "mobilityRate", "mobilityRateSource", "mobilityRateCheckedAt", "payrollCommuneCode", "payrollCity", "payrollPostalCode"
    FROM "organizations" WHERE "id" = ${input.organizationId} LIMIT 1
  `;
  const row = rows[0];
  const storedRate = row?.mobilityRate === null || row?.mobilityRate === undefined ? null : Number(row.mobilityRate);
  const stored = storedRate !== null && Number.isFinite(storedRate) ? storedRate : null;

  if (row?.mobilityRateSource === "MANUEL" && stored !== null) return { ratePercent: stored, warning: null };

  let communeCode = row?.payrollCommuneCode?.trim() ?? "";
  // Organisation paramétrée avant la reprise automatique : on retrouve le code Insee de sa commune.
  if (!communeCode && row?.payrollCity?.trim()) {
    communeCode = (await lookupCommuneCode(row.payrollPostalCode?.trim() || null, row.payrollCity)) ?? "";
    if (communeCode) await prisma.$executeRaw`UPDATE "organizations" SET "payrollCommuneCode" = ${communeCode} WHERE "id" = ${input.organizationId}`;
  }
  if (communeCode) {
    const resolution = await fetchMobilityRate(communeCode, input.periodFirstDay);
    if (resolution.status === "RESOLVED") {
      const currentMonth = new Date().toISOString().slice(0, 7);
      // On ne mémorise que le taux d'une période courante ou future : recalculer un mois ancien ne doit pas écraser le taux du jour.
      if (input.periodFirstDay.slice(0, 7) >= currentMonth) {
        await prisma.$executeRaw`
          UPDATE "organizations"
          SET "mobilityRate" = ${resolution.ratePercent}, "mobilityRateSource" = 'URSSAF', "mobilityRateCheckedAt" = ${new Date()}, "mobilityRateDetail" = ${describeMobilityRate(resolution)}
          WHERE "id" = ${input.organizationId} AND ("mobilityRateSource" IS NULL OR "mobilityRateSource" <> 'MANUEL')
        `;
      }
      return { ratePercent: resolution.ratePercent, warning: null };
    }
  }

  if (stored !== null) {
    const checked = row?.mobilityRateCheckedAt ? ` vérifié le ${frDay(row.mobilityRateCheckedAt)}` : "";
    return {
      ratePercent: stored,
      warning: `Le barème du versement mobilité de l'Urssaf n'a pas pu être consulté : le dernier taux connu (${String(stored).replace(".", ",")} %${checked}) est appliqué. Recalculez plus tard pour le confirmer.`,
    };
  }

  if (!communeCode) {
    throw new Error("Calcul bloqué : la commune de l'établissement n'est pas identifiée, le taux de versement mobilité ne peut pas être déterminé. Dans Configuration > Organisation, cliquez sur « Actualiser depuis le SIRET », ou indiquez le taux vous-même.");
  }
  throw new Error("Calcul bloqué : le barème du versement mobilité de l'Urssaf ne répond pas pour le moment. Relancez le calcul dans quelques minutes, ou indiquez le taux dans Configuration > Organisation.");
}
