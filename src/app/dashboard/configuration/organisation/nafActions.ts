"use server";
import { getCurrentMembership } from "@/lib/auth";
import { isOrganizationAdmin } from "@/lib/accessPolicy";
import { normalizeNaf, observedNafConventions } from "@/lib/nafConventions";
import { prisma } from "@/lib/prisma";
export async function suggestNafConventions(value: string): Promise<{ error?: string; candidates?: Array<{ idcc: string; name: string }> }> {
 const membership = await getCurrentMembership();
 if (!membership || !isOrganizationAdmin(membership)) return { error: "Action non autorisée." };
 const naf = normalizeNaf(value);
 if (!naf) return { error: "Code APE invalide (exemple : 62.02A)." };
 try {
  const url = new URL("https://recherche-entreprises.api.gouv.fr/search");
  url.searchParams.set("activite_principale", naf);
  url.searchParams.set("per_page", "25");
  const response = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) });
  if (!response.ok) return { error: "Le registre officiel est momentanément indisponible." };
  const idccs = observedNafConventions(await response.json(), naf);
  const known = await prisma.collectiveAgreement.findMany({ where: { idcc: { in: idccs } }, select: { idcc: true, name: true } });
  return { candidates: idccs.map(idcc => ({ idcc, name: known.find(item => item.idcc === idcc)?.name ?? `Convention IDCC ${idcc}` })) };
 } catch { return { error: "Impossible de consulter le registre officiel. Vous pouvez choisir votre convention manuellement." }; }
}
