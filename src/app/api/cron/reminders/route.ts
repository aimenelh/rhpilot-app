import { NextResponse } from "next/server";
import { sendConfiguredReminders } from "@/lib/reminders";

// Vercel signe automatiquement ses appels de tâche planifiée avec ce
// jeton (Authorization: Bearer CRON_SECRET) — sans lui, n'importe qui
// pourrait déclencher des envois d'emails en appelant cette route
// publiquement. Voir vercel.json pour la programmation (une fois par
// jour).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const result = await sendConfiguredReminders();
  return NextResponse.json(result);
}
