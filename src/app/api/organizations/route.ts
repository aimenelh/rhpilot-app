import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkSiret } from "@/lib/siret";
import { syncOrganizationFromRegistry } from "@/lib/organization-registry-sync";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // L'interface actuelle ne sait gérer qu'une organisation active par
  // utilisateur. Bloquer ici évite de créer une deuxième organisation
  // "fantôme" qui serait ensuite invisible puisque getCurrentMembership()
  // sélectionne la première appartenance active.
  const existingMembership = await prisma.membership.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { id: true },
  });
  if (existingMembership) {
    return NextResponse.json(
      { error: "Vous appartenez déjà à une organisation active." },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  // SIRET obligatoire : les tests passent par les données de démonstration
  // et les tutoriels, un espace RH correspond toujours à une vraie entreprise.
  const siretCheck = checkSiret(body?.siret);
  if (!siretCheck.ok) {
    return NextResponse.json({ error: siretCheck.error }, { status: 400 });
  }
  const siret = siretCheck.siret;

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

  // Paramétrage automatique depuis le SIRET (forme juridique, APE, adresse,
  // convention collective, versement mobilité). Un registre indisponible ne
  // doit jamais empêcher la création : le calcul de paie réessaiera.
  try {
    await syncOrganizationFromRegistry(organization.id, "FILL_BLANKS");
  } catch (error) {
    console.error("Reprise des données Sirene à la création impossible :", error);
  }

  return NextResponse.json({ organization }, { status: 201 });
}
