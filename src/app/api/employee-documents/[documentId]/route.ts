import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { isOrganizationAdmin } from "@/lib/accessPolicy";
import { logVaultEvent, readVaultDocument, requestFingerprint } from "@/lib/employee-space/vault";
import { safeFileName } from "@/lib/employee-space/labels";

export const dynamic = "force-dynamic";

/** Téléchargement d'un document salarié par un administrateur (impression, contrôle). */
export async function GET(request: Request, { params }: { params: { documentId: string } }) {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return new NextResponse("Non autorisé", { status: 401 });
  if (!isOrganizationAdmin(membership)) return new NextResponse("Accès réservé aux administrateurs", { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(params.documentId)) return new NextResponse("Document introuvable", { status: 404 });
  try {
    const document = await readVaultDocument(membership.organizationId, params.documentId);
    if (!document) return new NextResponse("Document introuvable", { status: 404 });
    await logVaultEvent(prisma, { organizationId: membership.organizationId, documentId: document.id, employeeId: document.employeeId, action: "DOWNLOADED", actorKind: "EMPLOYER", actorUserId: user.id, metadata: requestFingerprint(request) });
    await prisma.auditLog.create({ data: { id: randomUUID(), organizationId: membership.organizationId, actorUserId: user.id, action: "employee_space.document.downloaded", entityType: "EmployeeDocument", entityId: document.id, metadata: { employeeId: document.employeeId, kind: document.kind } } });
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
    return new NextResponse("Document illisible", { status: 500 });
  }
}
