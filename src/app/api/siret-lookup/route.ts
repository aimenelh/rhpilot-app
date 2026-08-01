import { NextResponse } from "next/server";

// Appelle l'API publique gratuite de l'État français (aucune clé
// requise, données Sirene/INSEE en temps réel). Volontairement un
// simple confort de saisie : ne prouve jamais qu'un utilisateur
// appartient réellement à l'entreprise trouvée — un SIRET est une
// donnée publique, pas une preuve d'identité.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siretRaw = searchParams.get("siret")?.replace(/\s/g, "") ?? "";

  if (!/^\d{14}$/.test(siretRaw)) {
    return NextResponse.json(
      { error: "Le SIRET doit contenir exactement 14 chiffres." },
      { status: 400 }
    );
  }

  try {
    // Confirmé par test réel : le préfixe "siren:" documenté ne
    // fonctionne plus (renvoie 0 résultat même pour un SIREN connu et
    // valide). Une recherche en texte brut sur le SIREN, en revanche,
    // fonctionne — l'API le retrouve via la recherche plein texte.
    const siren = siretRaw.slice(0, 9);
    const response = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${siren}`,
      { headers: { Accept: "application/json" } }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Le service de recherche d'entreprises est momentanément indisponible." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const result = data.results?.[0];

    if (!result) {
      return NextResponse.json(
        { error: "Aucune entreprise trouvée pour ce SIRET." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      name: result.nom_complet ?? result.nom_raison_sociale ?? null,
      address: result.siege?.adresse ?? null,
      city: result.siege?.libelle_commune ?? null,
      apeCode: result.activite_principale ?? null,
    });
  } catch (error) {
    console.error("Erreur lors de la recherche SIRET :", error);
    return NextResponse.json(
      { error: "Impossible de contacter le service de recherche d'entreprises." },
      { status: 502 }
    );
  }
}
