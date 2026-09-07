import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readAbsenceJustification } from "@/lib/absence-justification-storage";

function safeFileName(name: string | null | undefined) {
  const cleaned = (name ?? "justificatif").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return cleaned || "justificatif";
}

export async function GET(
  _request: Request,
  { params }: { params: { justificationId: string } },
) {
  const membership = await getCurrentMembership();
  if (!membership) return new NextResponse("Non autorisé", { status: 401 });

  const justification = await prisma.absenceJustification.findFirst({
    where: {
      id: params.justificationId,
      absence: { organizationId: membership.organizationId },
    },
    select: {
      storageKey: true,
      fileName: true,
      mimeType: true,
    },
  });

  if (!justification) return new NextResponse("Justificatif introuvable", { status: 404 });
  if (!justification.storageKey || !justification.mimeType) {
    return new NextResponse("Document non disponible", { status: 404 });
  }

  try {
    const bytes = readAbsenceJustification(justification.storageKey);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": justification.mimeType,
        "Content-Disposition": `inline; filename="${safeFileName(justification.fileName)}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Document invalide", { status: 500 });
  }
}
