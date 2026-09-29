/** @type {import('next').NextConfig} */
// En-têtes de sécurité appliqués à toutes les réponses. Pas encore de CSP stricte :
// Clerk et Stripe chargent des scripts et des iframes, une CSP doit d'abord être
// testée en production (en mode Report-Only) pour ne pas casser la connexion.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // ESLint tourne dans la CI (npm run lint) ; une alerte ne doit pas bloquer un déploiement.
  eslint: { ignoreDuringBuilds: true },
  images: {
    formats: ["image/avif", "image/webp"],
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
