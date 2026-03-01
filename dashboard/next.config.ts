import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Disable StrictMode to avoid double auth calls in dev with local Docker Supabase */
  reactStrictMode: false,
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
};

export default nextConfig;
