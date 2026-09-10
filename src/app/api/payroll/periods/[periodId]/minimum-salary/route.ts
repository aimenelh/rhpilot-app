import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type MinimumSalaryControl = {
  status: "APPLICABLE" | "UNRESOLVED";
  source?: "SMIC" | "COLLECTIVE_AGREEMENT";
  appliedMonthlyMinimumCents?: number;
  smicMonthlyMinimumCents?: number;
  collectiveMonthlyMinimumCents?: number | null;
  compliant?: boolean;
  differenceCents?: number;
  smicRuleCode?: string;
  smicRuleVersionId?: string;
  collectiveRuleVersionId?: string;
  explanation: string;
  code?: string;
};

type CalculationSnapshot = {
  minimumSalaryControl?: unknown;
};

function isMinimumSalaryControl(value: unknown): value is MinimumSalaryControl {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    (item.status === "APPLICABLE" || item.status === "UNRESOLVED") &&
    typeof item.explanation === "string"
  );
}

export async function GET(
  _request: Request,
  { params }: { params: { periodId: string } },
) {
  const membership = await getCurrentMembership();
  if (!membership) return new NextResponse("Non autorisé", { status: 401 });

  const period = await prisma.payrollPeriod.findFirst({
    where: { id: params.periodId, organizationId: membership.organizationId },
    select: { id: true },
  });

  if (!period) return new NextResponse("Période de paie introuvable.", { status: 404 });

  const calculations = await prisma.payrollCalculation.findMany({
    where: { organizationId: membership.organizationId, payrollPeriodId: period.id },
    select: { employeeId: true, calculationSnapshot: true },
  });

  return NextResponse.json(
    calculations.map((calculation) => {
      const snapshot = calculation.calculationSnapshot as CalculationSnapshot;
      return {
        employeeId: calculation.employeeId,
        minimumSalaryControl: isMinimumSalaryControl(snapshot?.minimumSalaryControl)
          ? snapshot.minimumSalaryControl
          : null,
      };
    }),
    {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
