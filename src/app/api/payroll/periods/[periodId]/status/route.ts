import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { periodId: string } },
) {
  const membership = await getCurrentMembership();
  if (!membership) return new NextResponse("Non autorisé", { status: 401 });

  const period = await prisma.payrollPeriod.findFirst({
    where: {
      id: params.periodId,
      organizationId: membership.organizationId,
    },
    select: { id: true, status: true },
  });

  if (!period) return new NextResponse("Période de paie introuvable.", { status: 404 });

  return NextResponse.json(
    { status: period.status },
    {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
