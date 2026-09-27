import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getEmployeeAccountsForUser } from "@/lib/employee-space/session";
import { logVaultEvent, readVaultDocument, requestFingerprint } from "@/lib/employee-space/vault";
import { safeFileName } from "@/lib/employee-space/labels";

export const dynamic = "force-dynamic";

/** Téléchargement d'un document par le salarié : vérifie qu'il lui appartient et le journalise. */
export async function GET(request: Request, { params }: { params: { documentId: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    // Session expirée (vieil onglet sur un téléphone) : la connexion salarié, puis retour à l'espace.
    return NextResponse.redirect(new URL("/espace/connexion", request.url));
  }
  if (!/^[0-9a-f-]{36}$/i.test(params.documentId)) return new NextResponse("Document introuvable", { status: 404 });

  const owner = await prisma.$queryRaw<Array<{ organizationId: string; employeeId: string }>>`
    SELECT "organizationId", "employeeId" FROM "employee_documents" WHERE "id" = ${params.documentId}`;
  const row = owner[0];
  const accounts = await getEmployeeAccountsForUser(user.id);
  if (!row || !accounts.some((account) => account.organizationId === row.organizationId && account.employeeId === row.employeeId)) {
    return new NextResponse("Document introuvable", { status: 404 });
  }

  try {
    const document = await readVaultDocument(row.organizationId, params.documentId);
    if (!document) return new NextResponse("Document introuvable", { status: 404 });
    await logVaultEvent(prisma, { organizationId: row.organizationId, documentId: document.id, employeeId: row.employeeId, action: "DOWNLOADED", actorKind: "EMPLOYEE", actorUserId: user.id, metadata: requestFingerprint(request) });
    return new NextResponse(new Uint8Array(document.pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFileName(document.fileName)}"`,
        "Content-Length": String(document.pdf.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Document illisible : prévenez votre employeur.", { status: 500 });
  }
}
