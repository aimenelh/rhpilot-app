/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    outputFileTracingIncludes: {
      "/*": ["./node_modules/pdfkit/js/data/**/*"],
    },
  },
};

export default nextConfig;
