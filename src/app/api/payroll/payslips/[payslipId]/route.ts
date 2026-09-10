import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readPayslipDocument } from "@/lib/payroll/payslip-storage";

function safeFilePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "salarie";
}

export async function GET(
  _request: Request,
  { params }: { params: { payslipId: string } },
) {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return new NextResponse("Non autorisé", { status: 401 });

  const payslip = await prisma.payslip.findFirst({
    where: { id: params.payslipId, organizationId: membership.organizationId },
    select: {
      id: true,
      employeeId: true,
      documentStatus: true,
      storageKey: true,
      employee: { select: { firstName: true, lastName: true } },
    },
  });

  if (!payslip) return new NextResponse("Bulletin introuvable", { status: 404 });
  if (payslip.documentStatus !== "GENERATED" && payslip.documentStatus !== "PUBLISHED") return new NextResponse("Bulletin non disponible", { status: 409 });
  if (!payslip.storageKey) return new NextResponse("Document non stocké", { status: 404 });

  try {
    const pdf = readPayslipDocument(payslip.storageKey);
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "payroll.payslip.downloaded",
        entityType: "Payslip",
        entityId: payslip.id,
        metadata: { employeeId: payslip.employeeId, documentStatus: payslip.documentStatus },
      },
    });

    const employeeName = safeFilePart(`${payslip.employee.firstName}-${payslip.employee.lastName}`);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bulletin-${employeeName}.pdf"`,
        "Content-Length": String(pdf.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Document invalide", { status: 500 });
  }
}
