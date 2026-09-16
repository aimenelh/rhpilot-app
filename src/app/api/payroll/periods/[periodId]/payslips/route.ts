import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mergePayslipPdfs } from "@/lib/payroll/payslip-pdf-merge";
import { readPayslipDocument } from "@/lib/payroll/payslip-storage";

export async function GET(_request: Request, { params }: { params: { periodId: string } }) {
  const membership = await getCurrentMembership();
  if (!membership) return NextResponse.json({ error: "Session expirée, veuillez vous reconnecter." }, { status: 401 });
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });

  const period = await prisma.payrollPeriod.findFirst({
    where: { id: params.periodId, organizationId: membership.organizationId },
    select: { id: true, year: true, month: true, status: true },
  });
  if (!period) return NextResponse.json({ error: "Période de paie introuvable." }, { status: 404 });
  if (period.status !== "LOCKED") return NextResponse.json({ error: "Les bulletins groupés sont disponibles après verrouillage de la période." }, { status: 409 });

  const payslips = await prisma.payslip.findMany({
    where: {
      organizationId: membership.organizationId,
      payrollPeriodId: period.id,
      documentStatus: { in: ["GENERATED", "PUBLISHED"] },
      storageKey: { not: null },
    },
    select: { id: true, employeeId: true, storageKey: true },
    orderBy: { employeeId: "asc" },
  });
  const lockedCalculations = await prisma.payrollCalculation.findMany({ where: { organizationId: membership.organizationId, payrollPeriodId: period.id }, select: { employeeId: true } });
  const expectedIds = new Set(lockedCalculations.map(calculation => calculation.employeeId));
  const employees = expectedIds.size;
  if (payslips.length !== employees || employees === 0 || payslips.some(payslip => !expectedIds.has(payslip.employeeId)) || new Set(payslips.map(payslip => payslip.employeeId)).size !== employees) {
    return NextResponse.json({ error: `Les bulletins ne sont pas encore tous générés (${payslips.length}/${employees}). Générez d'abord les bulletins de la période.` }, { status: 409 });
  }

  try {
    const pdfs = payslips.map((payslip) => readPayslipDocument(payslip.storageKey!));
    const merged = await mergePayslipPdfs(pdfs);
    const month = String(period.month).padStart(2, "0");
    return new NextResponse(merged as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bulletins-${month}-${period.year}.pdf"`,
        "Content-Length": String(merged.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossible d'assembler les bulletins PDF." }, { status: 500 });
  }
}
