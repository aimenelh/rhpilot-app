import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { buildContractWorkTime } from "@/lib/contractWorkTime";

type Db = Prisma.TransactionClient;

function dayBefore(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - 1,
  ));
}

export type SaveEmployeeWorkProfileInput = {
  organizationId: string;
  employeeId: string;
  effectiveFrom: Date;
  weeklyHours: number;
  weeklySchedule?: readonly number[] | null;
  /** Utilisé par l'import CSV initial ; undefined = conserver la rémunération existante. */
  baseSalaryCents?: number | null;
};

/**
 * Le profil paie est déjà la source versionnée du temps de travail.
 * Cette fonction y écrit les données contractuelles sans créer une seconde source de vérité.
 *
 * - même date d'effet : mise à jour du profil existant ;
 * - nouvelle date d'effet : création d'une version en recopiant les paramètres de paie
 *   du profil précédent, puis fermeture de celui-ci la veille.
 */
export async function saveEmployeeWorkProfile(
  tx: Db,
  input: SaveEmployeeWorkProfileInput,
): Promise<void> {
  const work = buildContractWorkTime(input.weeklyHours, input.weeklySchedule);
  const effectiveFrom = new Date(Date.UTC(
    input.effectiveFrom.getUTCFullYear(),
    input.effectiveFrom.getUTCMonth(),
    input.effectiveFrom.getUTCDate(),
  ));

  const exact = await tx.payrollProfile.findUnique({
    where: {
      organizationId_employeeId_effectiveFrom: {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        effectiveFrom,
      },
    },
  });

  if (exact) {
    await tx.payrollProfile.update({
      where: { id: exact.id },
      data: {
        monthlyHours: work.monthlyHours,
        weeklySchedule: work.schedule as unknown as Prisma.InputJsonValue,
        structuralOvertimeHours: work.structuralOvertimeMonthlyHours,
        ...(input.baseSalaryCents !== undefined ? { baseSalaryCents: input.baseSalaryCents } : {}),
      },
    });
    return;
  }

  const [previous, next] = await Promise.all([
    tx.payrollProfile.findFirst({
      where: {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        effectiveFrom: { lt: effectiveFrom },
      },
      orderBy: { effectiveFrom: "desc" },
    }),
    tx.payrollProfile.findFirst({
      where: {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        effectiveFrom: { gt: effectiveFrom },
      },
      orderBy: { effectiveFrom: "asc" },
    }),
  ]);

  const source = previous ?? next;

  await tx.payrollProfile.create({
    data: {
      id: randomUUID(),
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      payFrequency: source?.payFrequency ?? "MONTHLY",
      currency: source?.currency ?? "EUR",
      baseSalaryCents:
        input.baseSalaryCents !== undefined
          ? input.baseSalaryCents
          : source?.baseSalaryCents ?? null,
      monthlyHours: work.monthlyHours,
      collectiveAgreementId: source?.collectiveAgreementId ?? null,
      classificationCode: source?.classificationCode ?? null,
      classificationLabel: source?.classificationLabel ?? null,
      level: source?.level ?? null,
      coefficient: source?.coefficient ?? null,
      seniorityDate: source?.seniorityDate ?? null,
      employeeAddress: source?.employeeAddress ?? null,
      weeklySchedule: work.schedule as unknown as Prisma.InputJsonValue,
      structuralOvertimeHours: work.structuralOvertimeMonthlyHours,
      structuralOvertimeRate: source?.structuralOvertimeRate ?? null,
      healthPlanWaiver: source?.healthPlanWaiver ?? false,
      effectiveFrom,
      effectiveUntil: next ? dayBefore(next.effectiveFrom) : null,
    },
  });

  // Ferme uniquement les versions qui couvraient encore la nouvelle date.
  await tx.payrollProfile.updateMany({
    where: {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      effectiveFrom: { lt: effectiveFrom },
      OR: [
        { effectiveUntil: null },
        { effectiveUntil: { gte: effectiveFrom } },
      ],
    },
    data: { effectiveUntil: dayBefore(effectiveFrom) },
  });
}
