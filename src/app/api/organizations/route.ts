import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const siretRaw = typeof body?.siret === "string" ? body.siret.trim() : null;
  const siret = siretRaw && /^\d{14}$/.test(siretRaw) ? siretRaw : null;

  if (!name || name.length < 2) {
    return NextResponse.json(
      { error: "Le nom de l'organisation doit contenir au moins 2 caractères" },
      { status: 400 }
    );
  }

  const organization = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name, siret } });

    await tx.membership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        accessRole: "OWNER",
      },
    });

    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: org.id,
        actorUserId: user.id,
        action: "organization.created",
        entityType: "Organization",
        entityId: org.id,
      },
    });

    return org;
  });

  return NextResponse.json({ organization }, { status: 201 });
}
