import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readPayslipDocument } from "@/lib/payroll/payslip-storage";

export async function GET(
  _request: Request,
  { params }: { params: { payslipId: string } },
) {
  const membership = await getCurrentMembership();
  if (!membership) return new NextResponse("Non autorisé", { status: 401 });

  const payslip = await prisma.payslip.findFirst({
    where: {
      id: params.payslipId,
      organizationId: membership.organizationId,
    },
    select: {
      id: true,
      employeeId: true,
      documentStatus: true,
      storageKey: true,
    },
  });

  if (!payslip) return new NextResponse("Bulletin introuvable", { status: 404 });
  if (payslip.documentStatus !== "GENERATED" && payslip.documentStatus !== "PUBLISHED") {
    return new NextResponse("Bulletin non disponible", { status: 409 });
  }
  if (!payslip.storageKey) return new NextResponse("Document non stocké", { status: 404 });

  try {
    const pdf = readPayslipDocument(payslip.storageKey);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bulletin-${payslip.employeeId}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Document invalide", { status: 500 });
  }
}
