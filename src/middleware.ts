import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Logique inversée : tout est public, sauf l'espace connecté et les API privées.
// Le site vitrine, robots.txt, le sitemap, les images de partage et la page 404
// restent ainsi accessibles sans session (une URL mal tapée affiche la 404,
// pas l'écran de connexion).
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/welcome(.*)",
  "/entering(.*)",
  "/creating-account(.*)",
  "/api/(.*)",
]);

// API appelées sans session Clerk : espace salarié (sa propre session), webhooks
// signés, cron authentifié par CRON_SECRET. Chacune vérifie elle-même l'appelant.
const isPublicApi = createRouteMatcher([
  "/api/espace/(.*)",
  "/api/webhooks/(.*)",
  "/api/cron/(.*)",
]);

export default clerkMiddleware((auth, request) => {
  if (isProtectedRoute(request) && !isPublicApi(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
