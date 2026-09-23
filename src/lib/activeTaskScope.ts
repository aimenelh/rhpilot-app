import type { Prisma } from "@prisma/client";

/**
 * Définition unique d'une tâche qui appartient encore au périmètre actif
 * de RH Pilot. Une tâche d'un parcours archivé ou d'un salarié archivé
 * ne doit jamais réapparaître dans le dashboard, le Copilote, la recherche
 * ou les notifications.
 */
export const ACTIVE_TASK_SCOPE = {
  employeeEvent: {
    deletedAt: null,
    employee: { deletedAt: null },
  },
} satisfies Prisma.TaskWhereInput;
