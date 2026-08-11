"use server";

import { prisma } from "@/lib/prisma";

export type DiagnosticAnswers = {
  periodeEssai: string;
  visiteMedicale: string;
  responsabilites: string;
  entretienPro: string;
  surcharge: string;
  companySize: string;
};

export type SubmitDiagnosticState = { saved: boolean; error: string } | undefined;

export async function submitDiagnostic(
  answers: DiagnosticAnswers,
  riskAreas: string[],
  email: string | null
): Promise<SubmitDiagnosticState> {
  try {
    await prisma.diagnosticResponse.create({
      data: {
        answers,
        riskAreas,
        email: email || null,
        companySize: answers.companySize,
      },
    });
    return { saved: true, error: "" };
  } catch (err) {
    // On ne bloque jamais l'utilisateur si l'enregistrement échoue —
    // il a déjà son diagnostic à l'écran, ça reste la priorité.
    console.error("Erreur submitDiagnostic:", err);
    return { saved: false, error: "L'enregistrement a échoué, mais votre diagnostic reste valable." };
  }
}
