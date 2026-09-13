/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
