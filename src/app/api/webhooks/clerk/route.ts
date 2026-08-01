import { headers } from "next/headers";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";

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
      // Correspond au "temps 1" de la stratégie de suppression :
      // désactivation immédiate, jamais de suppression physique ici.
      // La purge (temps 3) reste un job explicite séparé.
      const data = event.data as { id: string };
      const existing = await prisma.user.findUnique({
        where: { authProviderId: data.id },
      });

      if (existing) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: existing.id },
            data: {
              deletedAt: new Date(),
              authProviderId: null,
              email: `deleted-${existing.id}@rhpilot.invalid`,
            },
          }),
          prisma.membership.updateMany({
            where: { userId: existing.id, deletedAt: null },
            data: { deletedAt: new Date() },
          }),
        ]);
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
