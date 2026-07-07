import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Autorise 127.0.0.1 et localhost en dev (évite "Failed to fetch")
  allowedDevOrigins: ["127.0.0.1:3001", "localhost:3001"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    scrollRestoration: true,
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
  // Désactive le cache webpack en dev — évite ENOSPC sur disque plein
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
