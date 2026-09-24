import { headers } from "next/headers";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import { chooseOwnershipSuccessor } from "@/lib/ownership";
import { randomUUID } from "node:crypto";
import { releaseMembershipResponsibilities } from "@/lib/membershipLifecycle";

// Webhook Clerk : synchronise notre table User avec les événements
// d'identité (création, mise à jour d'email, suppression de compte).
// Sécurité : la route est publique (voir middleware.ts) mais chaque
// requête est vérifiée par signature Svix — sans secret valide, rejetée
// avant toute écriture en base.
export async function POST(request: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SIGNING_SECRET manquant");
    return new Response("Configuration serveur incomplète", { status: 500 });
  }

  const headerPayload = headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("En-têtes Svix manquants", { status: 400 });
  }

  const body = await request.text();
  const webhook = new Webhook(webhookSecret);

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = webhook.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event;
  } catch (error) {
    console.error("Signature Clerk invalide :", error);
    return new Response("Signature invalide", { status: 400 });
  }

  switch (event.type) {
    case "user.created":
    case "user.updated": {
      const data = event.data as {
        id: string;
        email_addresses: { id: string; email_address: string }[];
        primary_email_address_id: string;
        first_name: string | null;
        last_name: string | null;
      };

      const primaryEmail = data.email_addresses.find(
        (entry) => entry.id === data.primary_email_address_id
      )?.email_address;

      if (!primaryEmail) {
        console.error(`user.created sans email primaire pour ${data.id}`);
        return new Response("Email primaire manquant", { status: 400 });
      }

      await prisma.user.upsert({
        where: { authProviderId: data.id },
        update: {
          email: primaryEmail,
          firstName: data.first_name,
          lastName: data.last_name,
        },
        create: {
          authProviderId: data.id,
          email: primaryEmail,
          firstName: data.first_name,
          lastName: data.last_name,
        },
      });
      break;
    }

    case "user.deleted": {
      // Désactivation immédiate, sans suppression physique. Si la personne
      // supprimée était OWNER d'une organisation qui possède encore des
      // membres actifs, on garantit d'abord qu'un propriétaire actif reste
      // en place afin de ne jamais rendre l'organisation administrativement
      // orpheline.
      const data = event.data as { id: string };
      const existing = await prisma.user.findUnique({
        where: { authProviderId: data.id },
      });

      if (existing) {
        const deletedAt = new Date();

        await prisma.$transaction(async (tx) => {
          const memberships = await tx.membership.findMany({
            where: { userId: existing.id, deletedAt: null },
            select: {
              id: true,
              organizationId: true,
              accessRole: true,
            },
          });

          for (const membership of memberships) {
            if (membership.accessRole === "OWNER") {
              const candidates = await tx.membership.findMany({
                where: {
                  organizationId: membership.organizationId,
                  deletedAt: null,
                  id: { not: membership.id },
                  user: { deletedAt: null },
                },
                select: {
                  id: true,
                  accessRole: true,
                  createdAt: true,
                },
              });

              const successor = chooseOwnershipSuccessor(candidates);
              if (successor) {
                if (successor.accessRole !== "OWNER") {
                  await tx.membership.update({
                    where: { id: successor.id },
                    data: { accessRole: "OWNER" },
                  });
                }

                await tx.auditLog.create({
                  data: {
                    id: randomUUID(),
                    organizationId: membership.organizationId,
                    actorUserId: null,
                    action: "ownership.transferred_after_account_deletion",
                    entityType: "Membership",
                    entityId: successor.id,
                    metadata: {
                      previousOwnerMembershipId: membership.id,
                      successorMembershipId: successor.id,
                    },
                  },
                });
              }
            }

            const releasedResponsibilities = await releaseMembershipResponsibilities(tx, {
              membershipId: membership.id,
              organizationId: membership.organizationId,
            });

            if (
              releasedResponsibilities.releasedTaskCount > 0 ||
              releasedResponsibilities.releasedManagerEmployeeCount > 0
            ) {
              await tx.auditLog.create({
                data: {
                  id: randomUUID(),
                  organizationId: membership.organizationId,
                  actorUserId: null,
                  action: "membership.responsibilities_released_after_account_deletion",
                  entityType: "Membership",
                  entityId: membership.id,
                  metadata: releasedResponsibilities,
                },
              });
            }
          }

          await tx.membership.updateMany({
            where: { userId: existing.id, deletedAt: null },
            data: { deletedAt },
          });

          await tx.user.update({
            where: { id: existing.id },
            data: {
              deletedAt,
              authProviderId: null,
              email: `deleted-${existing.id}@rhpilot.invalid`,
            },
          });
        });
      }
      break;
    }

    default:
      // Événements non traités au MVP (ex. session.*, org.* de Clerk
      // — rappel : les organisations Clerk ne sont pas utilisées,
      // RH Pilot gère son propre modèle Organization/Membership).
      break;
  }

  return new Response("OK", { status: 200 });
}
