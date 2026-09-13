/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  experimental: {
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
