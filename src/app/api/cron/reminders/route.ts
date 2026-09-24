import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendConfiguredReminders } from "@/lib/reminders";
import { sendScheduledDigests } from "@/lib/notifications";
import { syncStripeEmployeeQuantities } from "@/lib/billingSync";
import { PRO_ACCESS_STATUS_VALUES } from "@/lib/billingPolicy";

// Vercel signe automatiquement ses appels de tâche planifiée avec ce
// jeton (Authorization: Bearer CRON_SECRET) — sans lui, n'importe qui
// pourrait déclencher des envois d'emails en appelant cette route
// publiquement. Voir vercel.json pour la programmation (une fois par
// jour).

type CronStepResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: "internal_error" };

async function runCronStep<T>(name: string, task: () => Promise<T>): Promise<CronStepResult<T>> {
  try {
    return { ok: true, value: await task() };
  } catch (error) {
    console.error(`RH Pilot cron — étape ${name} échouée`, error);
    return { ok: false, error: "internal_error" };
  }
}

// Purge les salariés de démonstration (isDemoData) créés il y a plus
// de 48h, pour les organisations qui ne sont pas passées sur Pro
// entre-temps — empêche de renommer un jeu de données gratuit en
// salariés réels pour contourner la limite du palier Gratuit. Un
// archivage classique (deletedAt), jamais une suppression, cohérent
// avec le reste du produit.
async function purgeStaleDemoEmployees() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const staleDemoEmployees = await prisma.employee.findMany({
    where: {
      isDemoData: true,
      deletedAt: null,
      createdAt: { lt: cutoff },
      organization: {
        OR: [
          { subscriptionStatus: null },
          { subscriptionStatus: { notIn: [...PRO_ACCESS_STATUS_VALUES] } },
        ],
      },
    },
    select: { id: true },
  });

  if (staleDemoEmployees.length === 0) return { purgedCount: 0 };

  const result = await prisma.employee.updateMany({
    where: { id: { in: staleDemoEmployees.map((e) => e.id) } },
    data: { deletedAt: new Date() },
  });

  return { purgedCount: result.count };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Séquentiel volontairement : ce cron touche déjà plusieurs tables et
  // notre pool Postgres est volontairement petit en production. Inutile
  // de créer une pointe de connexions juste pour gagner quelques ms.
  const reminders = await runCronStep("reminders", () => sendConfiguredReminders());
  const digests = await runCronStep("digests", () => sendScheduledDigests());
  const demoPurge = await runCronStep("demoPurge", () => purgeStaleDemoEmployees());
  const billingSync = await runCronStep("billingSync", () => syncStripeEmployeeQuantities());

  const result = { reminders, digests, demoPurge, billingSync };
  const hasFailure = Object.values(result).some((step) => !step.ok);
  console.info("RH Pilot cron quotidien", result);

  return NextResponse.json(result, { status: hasFailure ? 500 : 200 });
}
