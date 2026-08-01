import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/auth";

function escapeCsvField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const membership = await getCurrentMembership();
  if (!membership) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const employees = await prisma.employee.findMany({
    where: { organizationId: membership.organizationId, deletedAt: null },
    include: { managerMembership: { include: { user: true } } },
    orderBy: { lastName: "asc" },
  });

  const headers = [
    "Civilité",
    "Prénom",
    "Nom",
    "Poste",
    "Date d'embauche",
    "Type de contrat",
    "Durée de période d'essai",
    "Unité",
    "Prochaine visite médicale",
    "Manager direct",
  ];

  const rows = employees.map((employee) => [
    employee.civility ?? "",
    employee.firstName,
    employee.lastName,
    employee.position ?? "",
    employee.hireDate.toISOString().slice(0, 10),
    employee.contractType ?? "",
    employee.probationDuration ?? "",
    employee.probationDurationUnit ?? "",
    employee.nextMedicalVisitDate?.toISOString().slice(0, 10) ?? "",
    employee.managerMembership?.user.email ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvField).join(","))
    .join("\n");

  // BOM UTF-8 en tête : évite les accents cassés à l'ouverture dans Excel.
  const csvWithBom = "\uFEFF" + csv;

  return new NextResponse(csvWithBom, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rhpilot-salaries-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
