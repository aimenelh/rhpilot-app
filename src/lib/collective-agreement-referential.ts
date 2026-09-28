/**
 * Référentiel des conventions collectives : retrouve une convention par son
 * IDCC ou l'ajoute (sans grille de minima : elles sont intégrées au fil de
 * l'eau, par migration, depuis Légifrance).
 */
import { prisma } from "@/lib/prisma";

export const COLLECTIVE_AGREEMENT_SOURCE = {
  name: "Code du travail numérique — Ministère du Travail",
  url: "https://code.travail.gouv.fr/outils/convention-collective/entreprise",
} as const;

export const KNOWN_CONVENTIONS = [
  { idcc: "1486", name: "Bureaux d'études techniques, cabinets d'ingénieurs-conseils et sociétés de conseils (Syntec)" },
  { idcc: "3248", name: "Métallurgie" },
  { idcc: "0573", name: "Commerces de gros" },
  { idcc: "2216", name: "Commerce de détail et de gros à prédominance alimentaire" },
  { idcc: "1979", name: "Hôtels, cafés, restaurants (HCR)" },
  { idcc: "1996", name: "Pharmacie d'officine" },
] as const;

export async function ensureCollectiveAgreementByIdcc(idcc: string, title: string | null): Promise<{ id: string; idcc: string; name: string }> {
  if (!/^\d{4}$/.test(idcc)) throw new Error("L'IDCC doit comporter exactement 4 chiffres.");
  const existing = await prisma.collectiveAgreement.findUnique({ where: { idcc }, select: { id: true, idcc: true, name: true } });
  if (existing) return existing;
  const known = KNOWN_CONVENTIONS.find((agreement) => agreement.idcc === idcc);
  const name = (title ?? known?.name ?? `Convention collective IDCC ${idcc}`).slice(0, 200);
  try {
    return await prisma.collectiveAgreement.create({
      data: { id: `ccn-${idcc}`, idcc, name, sourceName: COLLECTIVE_AGREEMENT_SOURCE.name, sourceUrl: COLLECTIVE_AGREEMENT_SOURCE.url, status: "ACTIVE" },
      select: { id: true, idcc: true, name: true },
    });
  } catch (error) {
    // Création concurrente par une autre organisation : on relit.
    const created = await prisma.collectiveAgreement.findUnique({ where: { idcc }, select: { id: true, idcc: true, name: true } });
    if (created) return created;
    throw error;
  }
}
