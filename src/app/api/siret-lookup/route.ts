import { NextResponse } from "next/server";
import { checkSiret } from "@/lib/siret";
import { lookupCompanyBySiret } from "@/lib/company-registry";

// Appelle les API publiques gratuites de l'État (répertoire Sirene de
// l'Insee, conventions collectives des ministères sociaux). Volontairement
// un confort de saisie : ne prouve jamais qu'un utilisateur appartient
// réellement à l'entreprise trouvée, un SIRET est une donnée publique.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const check = checkSiret(searchParams.get("siret"));
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  try {
    const lookup = await lookupCompanyBySiret(check.siret);
    if (lookup.status === "NOT_FOUND") return NextResponse.json({ error: "Aucune entreprise trouvée pour ce SIRET." }, { status: 404 });
    if (lookup.status === "UNAVAILABLE") return NextResponse.json({ error: "Le service de recherche d'entreprises est momentanément indisponible." }, { status: 502 });

    const { record } = lookup;
    return NextResponse.json({
      name: record.name,
      address: record.address,
      postalCode: record.postalCode,
      city: record.city,
      apeCode: record.nafCode,
      legalCategory: record.legalCategory,
      conventions: record.conventions,
      establishmentMatched: record.establishmentMatched,
      active: record.active,
    });
  } catch (error) {
    console.error("Erreur lors de la recherche SIRET :", error);
    return NextResponse.json({ error: "Impossible de contacter le service de recherche d'entreprises." }, { status: 502 });
  }
}
