import type { AccessRole } from "@prisma/client";

export type OwnershipCandidate = {
  id: string;
  accessRole: AccessRole;
  createdAt: Date;
};

const ROLE_PRIORITY: Record<AccessRole, number> = {
  OWNER: 0,
  ADMIN: 1,
  MEMBER: 2,
};

/**
 * Choisit de manière déterministe la personne qui conserve/reprend la
 * propriété lorsqu'un propriétaire supprime son compte Clerk.
 * Un propriétaire existant prime, puis un administrateur, puis le
 * membre actif le plus ancien.
 */
export function chooseOwnershipSuccessor<T extends OwnershipCandidate>(
  candidates: T[]
): T | null {
  if (candidates.length === 0) return null;

  return [...candidates].sort((a, b) => {
    const byRole = ROLE_PRIORITY[a.accessRole] - ROLE_PRIORITY[b.accessRole];
    if (byRole !== 0) return byRole;

    const byCreatedAt = a.createdAt.getTime() - b.createdAt.getTime();
    if (byCreatedAt !== 0) return byCreatedAt;

    return a.id.localeCompare(b.id);
  })[0];
}
