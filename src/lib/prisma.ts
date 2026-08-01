import { PrismaClient } from "@prisma/client";

// En développement, Next.js recharge les modules à chaud, ce qui
// créerait une nouvelle instance PrismaClient (et une nouvelle
// connexion DB) à chaque changement de fichier sans ce singleton
// global. Pattern standard recommandé par Prisma pour Next.js.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Filtre automatique des enregistrements soft-deleted à intégrer
    // ici via une extension Prisma Client dès que le besoin se
    // présente concrètement (Sprint 2+) — volontairement absent pour
    // l'instant, pas de logique métier prématurée en Sprint 1.
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
