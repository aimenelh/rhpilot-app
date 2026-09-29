import type { AccessRole } from "@prisma/client";
type Actor = { id: string; organizationId: string; accessRole: AccessRole; deletedAt: Date | null };
export function teamManagementError(actor: Actor | null, target: Actor | null, nextRole?: string): string | null {
  if (!actor || actor.deletedAt || !["OWNER", "ADMIN"].includes(actor.accessRole)) return "Action non autorisée.";
  if (!target || target.deletedAt || target.organizationId !== actor.organizationId) return "Membre introuvable.";
  if (target.id === actor.id) return "Vous ne pouvez pas modifier votre propre accès ici.";
  if (target.accessRole === "OWNER") return "L’accès du propriétaire ne peut pas être modifié ici.";
  if (nextRole !== undefined && !["ADMIN", "MEMBER"].includes(nextRole)) return "Rôle invalide.";
  if (actor.accessRole === "ADMIN" && (target.accessRole !== "MEMBER" || (nextRole !== undefined && nextRole !== "MEMBER"))) return "Seul le propriétaire peut gérer les administrateurs.";
  return null;
}
