import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Deuxième porte d'entrée vers la même invitation que celle envoyée
 * par email — pour la personne qui a été invitée mais n'a plus le
 * lien sous la main, ou qui arrive sur "Créer votre organisation"
 * sans savoir que rejoindre est aussi possible. Accepte soit le lien
 * complet collé, soit juste le code final.
 */
function extractToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? "";
  } catch {
    // Pas une URL valide — on suppose que c'est déjà le code brut.
    return trimmed;
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const existingMembership = await prisma.membership.findFirst({
    where: { userId: user.id, deletedAt: null },
  });
  if (existingMembership) {
    return NextResponse.json(
      { error: "Vous appartenez déjà à une organisation." },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => null);
  const raw = typeof body?.code === "string" ? body.code : "";
  const token = extractToken(raw);

  if (!token) {
    return NextResponse.json({ error: "Veuillez coller un code ou un lien d'invitation." }, { status: 400 });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Ce code d'invitation est introuvable." }, { status: 404 });
  }
  if (invitation.acceptedAt) {
    return NextResponse.json({ error: "Cette invitation a déjà été utilisée." }, { status: 409 });
  }
  if (invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: "Cette invitation a expiré." }, { status: 410 });
  }
  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json(
      { error: `Cette invitation a été envoyée à ${invitation.email}, pas à votre adresse.` },
      { status: 403 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.membership.create({
      data: {
        userId: user.id,
        organizationId: invitation.organizationId,
        accessRole: invitation.accessRole,
      },
    });
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        organizationId: invitation.organizationId,
        actorUserId: user.id,
        action: "invitation.accepted_via_code",
        entityType: "Invitation",
        entityId: invitation.id,
      },
    });
  });

  return NextResponse.json({ organization: invitation.organization }, { status: 200 });
}
