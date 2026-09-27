import { NextResponse } from "next/server";
import { getEmployeeSessionState } from "@/lib/employee-space/session";
import { employeeArchiveResponse } from "@/lib/employee-space/archive-server";

export const dynamic = "force-dynamic";

/** Tous les documents du salarié en une archive ZIP (C. trav. art. D3243-8). */
export async function GET(request: Request) {
  const session = await getEmployeeSessionState();
  if (session.state !== "ready") return NextResponse.redirect(new URL("/espace/connexion", request.url));
  const part = Number(new URL(request.url).searchParams.get("partie") ?? "1");
  if (!Number.isInteger(part) || part < 1 || part > 1000) return new NextResponse("Partie invalide", { status: 400 });
  const { account, user } = session;
  return employeeArchiveResponse({ organizationId: account.organizationId, employeeId: account.employeeId, employeeName: `${account.firstName} ${account.lastName}`, part, actorKind: "EMPLOYEE", actorUserId: user.id, request });
}
