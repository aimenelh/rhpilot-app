import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Point d'entrée de l'application installée (manifest.webmanifest) : un employeur
// connecté arrive sur son tableau de bord, un salarié sur son espace (qui renvoie
// lui-même vers la connexion salarié si besoin).
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const { userId } = auth();
  return NextResponse.redirect(new URL(userId ? "/dashboard" : "/espace", request.url));
}
