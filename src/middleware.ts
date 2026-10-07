import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  AUTH_CONTEXT_COOKIE,
  employeeContextBlocks,
  isEmployeePortalPath,
  isRhAuthEntryPath,
  type AuthContext,
} from "@/lib/authContext";

// Logique inversée : tout est public, sauf l'espace connecté et les API privées.
// Le site vitrine, robots.txt, le sitemap, les images de partage et la page 404
// restent ainsi accessibles sans session (une URL mal tapée affiche la 404,
// pas l'écran de connexion).
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
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
  const pathname = request.nextUrl.pathname;
  const requestedContext: AuthContext | null = isEmployeePortalPath(pathname)
    ? "employee"
    : isRhAuthEntryPath(pathname)
      ? "rh"
      : null;
  const currentContext = request.cookies.get(AUTH_CONTEXT_COOKIE)?.value;
  const effectiveContext = requestedContext ?? (currentContext === "employee" || currentContext === "rh" ? currentContext : null);

  // Un salarié déjà dans son portail ne doit pas pouvoir basculer par simple
  // navigation vers le back-office RH ou appeler une API RH privée.
  if (effectiveContext === "employee" && employeeContextBlocks(pathname)) {
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Accès réservé à l'espace RH." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/espace", request.url));
  }

  if (isProtectedRoute(request) && !isPublicApi(request)) {
    auth().protect();
  }

  const response = NextResponse.next();
  if (requestedContext) {
    response.cookies.set(AUTH_CONTEXT_COOKIE, requestedContext, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4|webm|mp3)).*)",
    "/(api|trpc)(.*)",
  ],
};
