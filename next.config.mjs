/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
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
