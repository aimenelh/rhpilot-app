import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readTaskAttachment } from "@/lib/task-attachment-storage";
import { taskAccessWhere } from "@/lib/accessPolicy";

function safeFileName(name: string | null | undefined) {
  const cleaned = (name ?? "piece-rh")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
  return cleaned || "piece-rh";
}

export async function GET(
  _request: Request,
  { params }: { params: { attachmentId: string } },
) {
  const membership = await getCurrentMembership();
  if (!membership) return new NextResponse("Non autorisé", { status: 401 });

  const attachment = await prisma.attachment.findFirst({
    where: {
      id: params.attachmentId,
      organizationId: membership.organizationId,
      task: taskAccessWhere(membership),
    },
    select: {
      storageKey: true,
      fileName: true,
      mimeType: true,
    },
  });

  if (!attachment) return new NextResponse("Pièce introuvable", { status: 404 });

  try {
    const bytes = readTaskAttachment(attachment.storageKey);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `inline; filename="${safeFileName(attachment.fileName)}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Document invalide", { status: 500 });
  }
}
