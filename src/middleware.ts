import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const WELCOME_COOKIE = "rhpilot_welcome_seen";

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
  const { pathname } = request.nextUrl;

  // Page de bienvenue bêta : la toute première chose vue sur le site,
  // avant même la page d'accueil, pour absolument tout le monde — un
  // cookie plutôt que le stockage du navigateur, parce que ça doit
  // fonctionner même pour un visiteur pas encore connecté. Jamais
  // pour /welcome elle-même (boucle infinie) ni pour les routes /api
  // (le webhook Clerk, en particulier, ne doit jamais être redirigé).
  const hasSeenWelcome = request.cookies.get(WELCOME_COOKIE);
  const isExcludedFromWelcomeGate = pathname === "/welcome" || pathname.startsWith("/api/");

  if (!hasSeenWelcome && !isExcludedFromWelcomeGate) {
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

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
