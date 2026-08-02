"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { AccessRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

const INVITATION_VALID_DAYS = 7;

function getAppUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

export type InviteFormState = { error: string } | { success: string } | undefined;

/**
 * Seuls OWNER et ADMIN peuvent inviter — un MEMBER ne doit pas
 * pouvoir faire grossir l'organisation sans validation.
 */
async function requireInvitePermission() {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) {
    throw new Error("Non authentifié ou aucune organisation active");
  }
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") {
    throw new Error("Seuls les propriétaires et administrateurs peuvent inviter.");
  }
  return { membership, user };
}

export async function createInvitation(
  _prevState: InviteFormState,
  formData: FormData
): Promise<InviteFormState> {
  let membership, user;
  try {
    ({ membership, user } = await requireInvitePermission());
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Action non autorisée." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const accessRoleRaw = String(formData.get("accessRole") ?? "MEMBER");
  const accessRole: AccessRole = accessRoleRaw === "ADMIN" ? "ADMIN" : "MEMBER";
  // Volontairement impossible d'inviter directement en OWNER — un
  // second propriétaire se décide autrement, pas via ce formulaire.

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Adresse email invalide." };
  }

  // Déjà membre de cette organisation ?
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const existingMembership = await prisma.membership.findFirst({
      where: { userId: existingUser.id, organizationId: membership.organizationId, deletedAt: null },
    });
    if (existingMembership) {
      return { error: "Cette personne fait déjà partie de votre organisation." };
    }
  }

  // Une invitation en attente existe déjà pour cet email ?
  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      organizationId: membership.organizationId,
      email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (existingInvitation) {
    return { error: "Une invitation est déjà en attente pour cette adresse." };
  }

  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_VALID_DAYS);

  await prisma.invitation.create({
    data: {
      organizationId: membership.organizationId,
      email,
      accessRole,
      token,
      createdByUserId: user.id,
      expiresAt,
    },
  });

  const organization = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
  });

  const joinUrl = `${getAppUrl()}/join/${token}`;
  const emailResult = await sendEmail({
    to: email,
    subject: `Vous êtes invité·e à rejoindre ${organization?.name ?? "une organisation"} sur RH Pilot`,
    html: `
      <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <p style="color: #0F1B3D; font-size: 15px;">Bonjour,</p>
        <p style="color: #3D4A6B; font-size: 14px;">
          Vous avez été invité·e à rejoindre <strong>${organization?.name ?? "une organisation"}</strong>
          sur RH Pilot, le copilote d'organisation RH.
        </p>
        <a href="${joinUrl}" style="display: inline-block; margin-top: 20px; background: linear-gradient(135deg, #2F6FED, #7C5CFC); color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          Rejoindre l'organisation
        </a>
        <p style="color: #8A93AB; font-size: 12px; margin-top: 24px;">
          Ce lien est valable 7 jours. Si vous ne vous attendiez pas à cette invitation,
          vous pouvez simplement ignorer cet email.
        </p>
      </div>`,
  });

  await prisma.auditLog.create({
    data: {
      organizationId: membership.organizationId,
      actorUserId: user.id,
      action: "invitation.created",
      entityType: "Invitation",
      entityId: token,
      metadata: { email, accessRole, emailSent: emailResult.ok },
    },
  });

  revalidatePath("/dashboard/team");

  if (!emailResult.ok) {
    return {
      error: `Invitation créée, mais l'email n'a pas pu être envoyé (${emailResult.error}). Vous pouvez transmettre le lien manuellement depuis la liste ci-dessous.`,
    };
  }

  return { success: `Invitation envoyée à ${email}.` };
}

export async function revokeInvitation(invitationId: string) {
  const { membership } = await requireInvitePermission();

  await prisma.invitation.deleteMany({
    where: { id: invitationId, organizationId: membership.organizationId },
  });

  revalidatePath("/dashboard/team");
}
