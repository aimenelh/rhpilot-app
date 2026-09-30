"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { escapeHtml, sendEmail } from "@/lib/email";
import { isPlausibleEmail, parseDiagnostic, RISK_AREA_TEXT, type DiagnosticAnswers } from "@/lib/diagnostic";
import { CANONICAL_SITE_URL } from "@/lib/appUrl";

export type { DiagnosticAnswers };
export type SubmitDiagnosticState = { saved: boolean; id?: string; error: string } | undefined;

// Garde-fou contre l'envoi en rafale depuis une même adresse (page publique, sans compte).
// En mémoire par instance : suffisant pour freiner un script, sans service externe.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const recent = new Map<string, number[]>();

function allowRequest(): boolean {
  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnue";
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((time) => now - time < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) return false;
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear();
  return true;
}

export async function submitDiagnostic(answers: DiagnosticAnswers, riskAreas: string[]): Promise<SubmitDiagnosticState> {
  const parsed = parseDiagnostic(answers, riskAreas);
  if (!parsed) return { saved: false, error: "Réponses invalides." };
  if (!allowRequest()) return { saved: false, error: "Trop de diagnostics envoyés, réessayez dans quelques minutes." };
  try {
    const id = randomUUID();
    await prisma.diagnosticResponse.create({
      data: { id, answers: parsed.answers, riskAreas: parsed.riskAreas, email: null, companySize: parsed.answers.companySize },
    });
    return { saved: true, id, error: "" };
  } catch (err) {
    // Le diagnostic reste affiché à l'écran même si l'enregistrement échoue.
    console.error("Erreur submitDiagnostic:", err);
    return { saved: false, error: "L'enregistrement a échoué, mais votre diagnostic reste valable." };
  }
}

/** Envoie réellement le diagnostic par e-mail, et rattache l'adresse à la réponse enregistrée. */
export async function sendDiagnosticByEmail(id: string, email: string): Promise<{ sent: boolean; error: string }> {
  const address = email.trim();
  if (!isPlausibleEmail(address)) return { sent: false, error: "Adresse e-mail invalide." };
  if (!allowRequest()) return { sent: false, error: "Trop de demandes, réessayez dans quelques minutes." };
  const response = await prisma.diagnosticResponse.findUnique({ where: { id }, select: { riskAreas: true, email: true, createdAt: true } }).catch(() => null);
  // Une réponse d'il y a plus d'une heure, ou déjà envoyée, ne se renvoie pas vers une autre adresse.
  if (!response || response.email || Date.now() - response.createdAt.getTime() > 60 * 60 * 1000) {
    return { sent: false, error: "Ce diagnostic ne peut plus être envoyé. Refaites-le en quelques secondes." };
  }
  const areas = response.riskAreas.map((area) => RISK_AREA_TEXT[area]).filter(Boolean);
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? CANONICAL_SITE_URL;
  const items = areas.length
    ? areas.map((area) => `<li style="margin:0 0 12px"><strong>${escapeHtml(area.label)}</strong><br><span style="color:#4A4A4D">${escapeHtml(area.tip)}</span></li>`).join("")
    : `<li>Aucun point de vigilance majeur : votre suivi RH est bien tenu.</li>`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#14151A;max-width:560px;margin:0 auto;padding:24px">
<p style="font-size:18px;font-weight:600;margin:0 0 12px">Votre diagnostic RH</p>
<p style="margin:0 0 16px;color:#4A4A4D">Voici les points relevés par vos réponses au diagnostic RH Pilot.</p>
<ul style="padding-left:18px;margin:0 0 20px">${items}</ul>
<p style="margin:0"><a href="${siteUrl}/diagnostic" style="color:#E8432E">Refaire le diagnostic</a> · <a href="${siteUrl}" style="color:#E8432E">Découvrir RH Pilot</a></p>
<p style="margin:24px 0 0;font-size:12px;color:#8C8C90">Vous recevez cet e-mail parce que vous l'avez demandé sur rhpilot.fr. Aucune autre communication ne vous sera envoyée.</p>
</div>`;
  const result = await sendEmail({ to: address, subject: "Votre diagnostic RH Pilot", html });
  if (!result.ok) return { sent: false, error: "L'envoi a échoué. Réessayez plus tard." };
  await prisma.diagnosticResponse.update({ where: { id }, data: { email: address } }).catch(() => undefined);
  return { sent: true, error: "" };
}
