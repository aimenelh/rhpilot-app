import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendConfiguredReminders } from "@/lib/reminders";

// Vercel signe automatiquement ses appels de tâche planifiée avec ce
// jeton (Authorization: Bearer CRON_SECRET) — sans lui, n'importe qui
// pourrait déclencher des envois d'emails en appelant cette route
// publiquement. Voir vercel.json pour la programmation (une fois par
// jour).

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
        OR: [{ subscriptionStatus: null }, { subscriptionStatus: { not: "active" } }],
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

  const [reminders, demoPurge] = await Promise.all([
    sendConfiguredReminders(),
    purgeStaleDemoEmployees(),
  ]);

  return NextResponse.json({ ...reminders, demoPurge });
}
