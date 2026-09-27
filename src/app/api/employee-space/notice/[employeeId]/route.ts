import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/auth";
import { isOrganizationAdmin } from "@/lib/accessPolicy";
import { renderElectronicPayslipNoticePdf } from "@/lib/employee-space/notice";
import { safeFileName } from "@/lib/employee-space/labels";

export const dynamic = "force-dynamic";

/** Note d'information sur le bulletin électronique, au nom du salarié, à faire signer. */
export async function GET(_request: Request, { params }: { params: { employeeId: string } }) {
  const membership = await getCurrentMembership();
  if (!membership) return new NextResponse("Non autorisé", { status: 401 });
  if (!isOrganizationAdmin(membership)) return new NextResponse("Accès réservé aux administrateurs", { status: 403 });
  const [organization, employee] = await Promise.all([
    prisma.organization.findFirst({ where: { id: membership.organizationId }, select: { name: true, siret: true, payrollAddress: true, payrollPostalCode: true, payrollCity: true } }),
    prisma.employee.findFirst({ where: { id: params.employeeId, organizationId: membership.organizationId, deletedAt: null }, select: { firstName: true, lastName: true, civility: true } }),
  ]);
  if (!organization || !employee) return new NextResponse("Salarié introuvable", { status: 404 });
  const pdf = await renderElectronicPayslipNoticePdf({
    employer: { name: organization.name, siret: organization.siret ?? "", address: organization.payrollAddress ?? "", postalCode: organization.payrollPostalCode ?? "", city: organization.payrollCity ?? "" },
    employee: { civility: employee.civility, firstName: employee.firstName, lastName: employee.lastName },
    issuedAt: new Date().toISOString().slice(0, 10),
  });
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeFileName(`note-bulletin-electronique-${employee.lastName}`)}"`,
      "Content-Length": String(pdf.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
