import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ContributionDetail = {
  code: string;
  label: string;
  sourceRule: string;
  side: "EMPLOYEE" | "EMPLOYER";
  amount: number;
};

type CalculationSnapshot = {
  socialEngine?: {
    modelVersion?: string;
    contributionDetails?: ContributionDetail[];
  };
};

function isContributionDetail(value: unknown): value is ContributionDetail {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.code === "string" &&
    typeof item.label === "string" &&
    typeof item.sourceRule === "string" &&
    (item.side === "EMPLOYEE" || item.side === "EMPLOYER") &&
    typeof item.amount === "number" &&
    Number.isFinite(item.amount)
  );
}

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
    select: { id: true },
  });

  if (!period) return new NextResponse("Période de paie introuvable.", { status: 404 });

  const calculations = await prisma.payrollCalculation.findMany({
    where: {
      organizationId: membership.organizationId,
      payrollPeriodId: period.id,
    },
    select: {
      employeeId: true,
      calculationSnapshot: true,
    },
  });

  const rows = calculations.map((calculation) => {
    const snapshot = calculation.calculationSnapshot as CalculationSnapshot;
    const details = Array.isArray(snapshot?.socialEngine?.contributionDetails)
      ? snapshot.socialEngine.contributionDetails.filter(isContributionDetail)
      : [];

    return {
      employeeId: calculation.employeeId,
      modelVersion: snapshot?.socialEngine?.modelVersion ?? null,
      contributionDetails: details,
    };
  });

  return NextResponse.json(rows, {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
