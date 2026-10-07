/** @type {import('next').NextConfig} */
// En-têtes de sécurité appliqués à toutes les réponses.
// La CSP démarre volontairement en Report-Only : Clerk, Stripe et Next injectent
// des ressources dynamiques qu'il faut observer avant de passer en enforcement.
const cspReportOnly = [
  "default-src 'self' https: data: blob:",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https:",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Pages retirées du site : redirection permanente vers la page la plus proche,
  // pour les liens déjà partagés et les moteurs de recherche.
  async redirects() {
    return [
      { source: "/pourquoi", destination: "/a-propos", permanent: true },
      { source: "/diagnostic", destination: "/", permanent: true },
      { source: "/feuille-de-route", destination: "/tarifs", permanent: true },
      { source: "/gestion-paie/montant-net-social", destination: "/gestion-paie", permanent: true },
      { source: "/gestion-paie/complementaire-sante", destination: "/gestion-paie", permanent: true },
      { source: "/gestion-paie/profil-paie", destination: "/gestion-paie", permanent: true },
      { source: "/gestion-paie/contexte-employeur", destination: "/gestion-paie", permanent: true },
      { source: "/gestion-paie/tracabilite-calcul", destination: "/gestion-paie/cotisations-sociales", permanent: true },
    ];
  },
  // ESLint tourne dans la CI (npm run lint) ; une alerte ne doit pas bloquer un déploiement.
  eslint: { ignoreDuringBuilds: true },
  images: {
    // AVIF désactivé tant que la migration vers une version de Next.js corrigée\n    // n’est pas terminée. Le format WebP reste optimisé côté Next/Vercel.\n    formats: ["image/webp"],
  },
  experimental: {
    // Les dépôts documentaires sont plafonnés à 4 Mo côté métier.
    // 4352 Ko laissent une petite marge au multipart tout en restant
    // sous la limite de payload des Functions Vercel.
    serverActions: {
      bodySizeLimit: "4352kb",
    },
    // PDFKit is a Node-only dependency. Keep it out of the Next.js
    // webpack bundle so its package exports/import maps are resolved by
    // Node at runtime.
    serverComponentsExternalPackages: ["pdfkit"],
    // Keep PDFKit's generated standard-font modules in the traced output.
    outputFileTracingIncludes: {
      "/*": ["./node_modules/pdfkit/**/*"],
    },
  },
};

export default nextConfig;
