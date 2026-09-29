import type { MetadataRoute } from "next";

// Site public ouvert à l’indexation — décision
// explicite, pas un oubli. Les pages privées (tableau de bord,
// paramètres...) restent hors de portée de toute façon : elles
// exigent une connexion, jamais accessibles à un robot anonyme.
export default function robots(): MetadataRoute.Robots {
  return {
    sitemap: "https://rhpilot.fr/sitemap.xml",
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api", "/espace", "/sign-in", "/sign-up", "/join", "/welcome", "/entering", "/creating-account"],
    },
  };
}
