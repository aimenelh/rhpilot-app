import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes publiques : landing, pages d'auth, pages de présentation de la paie,
// et les endpoints techniques qui ne nécessitent pas de session Clerk.
const isPublicRoute = createRouteMatcher([
  "/",
  "/services",
  "/tarifs",
  "/pourquoi",
  "/securite",
  "/mentions-legales",
  "/ressources",
  "/ressources(.*)",
  "/tutoriels",
  "/gestion-paie(.*)",
  "/diagnostic",
  "/questions",
  "/cgu",
  "/confidentialite",
  "/cookies",
  "/join(.*)",
  "/welcome",
  "/sign-in(.*)",
  "/sign-up(.*)",
  // Espace salarié : chaque page vérifie elle-même la session et renvoie vers
  // /espace/connexion, la connexion salarié qui s'affiche aussi sur téléphone.
  "/espace",
  "/espace/(.*)",
  "/api/espace/(.*)",
  "/api/webhooks/clerk",
  "/api/webhooks/stripe",
  "/api/cron/reminders",
]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
