import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPayrollMembership } from "@/lib/payrollAccess";
import { userFacingError } from "@/lib/userFacingError";
import { createDsnWorkEventArchive } from "@/lib/payroll/dsn-work-event-server";
import { openDsnWorkEventArchive } from "@/lib/payroll/dsn-work-event-archive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Archive = Awaited<ReturnType<typeof createDsnWorkEventArchive>>;
function fileResponse(archive: Archive) {
  const bytes = openDsnWorkEventArchive(archive);
  return new NextResponse(bytes as unknown as BodyInit, { headers: {
    "Content-Type": "text/plain; charset=iso-8859-1", "Content-Disposition": `attachment; filename="${archive.fileName}"`,
    "Content-Length": String(bytes.length), "Cache-Control": "private, no-store, max-age=0",
    "X-RH-Pilot-DSN-Norm": archive.normVersion, "X-RH-Pilot-DSN-Mode": "precontrole", "X-RH-Pilot-DSN-Nature": archive.nature,
    "X-RH-Pilot-DSN-Archive": archive.id, "X-RH-Pilot-DSN-SHA256": archive.sha256,
  } });
}
function failure(error: unknown) {
  const message = userFacingError(error, "Impossible de préparer ou de lire le signalement DSN.");
  return NextResponse.json({ error: message }, { status: message.startsWith("DSN bloquée") ? 409 : 500 });
}
const testMode = (request: Request) => (new URL(request.url).searchParams.get("mode") ?? "test") === "test";

export async function GET(request: Request, { params }: { params: { absenceId: string } }) {
  const membership = await getPayrollMembership();
  if (!membership) return NextResponse.json({ error: "Session expirée, veuillez vous reconnecter." }, { status: 401 });
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) return NextResponse.json({ error: "Accès DSN réservé aux administrateurs." }, { status: 403 });
  if (!testMode(request)) return NextResponse.json({ error: "Le dépôt réel reste bloqué." }, { status: 409 });
  try {
    const archiveId = new URL(request.url).searchParams.get("archiveId");
    const archive = await prisma.dsn_work_events.findFirst({ where: { organizationId: membership.organizationId, absenceId: params.absenceId, ...(archiveId ? { id: archiveId } : {}) }, orderBy: { createdAt: "desc" } });
    if (!archive) return NextResponse.json({ error: "Signalement archivé introuvable." }, { status: 404 });
    return fileResponse(archive);
  } catch (error) { return failure(error); }
}

export async function POST(request: Request, { params }: { params: { absenceId: string } }) {
  const membership = await getPayrollMembership();
  if (!membership) return NextResponse.json({ error: "Session expirée, veuillez vous reconnecter." }, { status: 401 });
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) return NextResponse.json({ error: "Accès DSN réservé aux administrateurs." }, { status: 403 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Origine de la requête invalide." }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "Requête JSON attendue." }, { status: 400 });
  if (!testMode(request)) return NextResponse.json({ error: "Le dépôt réel reste bloqué." }, { status: 409 });
  try {
    const body = await request.text();
    if (body.length > 4096) return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });
    const payload = JSON.parse(body) as { mode?: unknown; nature?: unknown; requestKey?: unknown };
    if (!payload || payload.mode !== "test") return NextResponse.json({ error: "Seul le pré-contrôle est disponible ; le dépôt réel reste bloqué." }, { status: 409 });
    if (payload.nature !== "04" && payload.nature !== "05") return NextResponse.json({ error: "Nature de signalement invalide." }, { status: 400 });
    if (typeof payload.requestKey !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(payload.requestKey)) return NextResponse.json({ error: "Identifiant de requête invalide." }, { status: 400 });
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Session expirée." }, { status: 401 });
    return fileResponse(await createDsnWorkEventArchive({ organizationId: membership.organizationId, absenceId: params.absenceId, nature: payload.nature, requestKey: payload.requestKey, actorUserId: user.id }));
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Requête JSON invalide." }, { status: 400 });
    return failure(error);
  }
}
