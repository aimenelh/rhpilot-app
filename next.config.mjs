/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pdfkit"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
