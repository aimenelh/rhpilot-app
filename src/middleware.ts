import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes publiques : landing (future), pages d'auth, et le webhook Clerk
// (qui doit rester accessible sans session utilisateur — sa sécurité
// vient de la vérification de signature Svix, pas de Clerk auth()).
const isPublicRoute = createRouteMatcher([
  "/",
  "/services",
  "/pourquoi",
  "/securite",
  "/mentions-legales",
  "/ressources",
  "/ressources(.*)",
  "/diagnostic",
  "/questions",
  "/cgu",
  "/confidentialite",
  "/cookies",
  "/join(.*)",
  "/welcome",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/clerk",
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
