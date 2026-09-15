import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/auth";
import { prepareDsnP26V01 } from "@/lib/payroll/dsn-preparation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { periodId: string } }) {
  const membership = await getCurrentMembership();
  if (!membership) return NextResponse.json({ error: "Session expirée, veuillez vous reconnecter." }, { status: 401 });
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) {
    return NextResponse.json({ error: "Accès DSN réservé aux administrateurs." }, { status: 403 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") ?? "test";
  if (mode !== "test") {
    return NextResponse.json(
      {
        error: "Le dépôt réel est volontairement bloqué. Utilisez d'abord l'export de pré-contrôle et Dsn-Val 2026.",
      },
      { status: 409 },
    );
  }

  try {
    const result = await prepareDsnP26V01({
      organizationId: membership.organizationId,
      periodId: params.periodId,
      testMode: true,
    });

    // NEODeS impose l'alphabet Latin-1 pour le fichier physique.
    // Toute donnée non représentable est rejetée au lieu d'être translittérée.
    for (const character of result.content) {
      if (character.charCodeAt(0) > 255) {
        return NextResponse.json(
          { error: `DSN bloquée : le fichier contient un caractère hors ISO-8859-1 (${JSON.stringify(character)}).` },
          { status: 409 },
        );
      }
    }
    const body = Buffer.from(result.content, "latin1");

    return new NextResponse(body as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=iso-8859-1",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Content-Length": String(body.length),
        "Cache-Control": "private, no-store, max-age=0",
        "X-RH-Pilot-DSN-Norm": result.normVersion,
        "X-RH-Pilot-DSN-Mode": "precontrole",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de préparer le fichier DSN.";
    const status = message.startsWith("DSN bloquée") || message.startsWith("Contrôle paie bloquant") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
