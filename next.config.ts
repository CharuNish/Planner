import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Wins photos are sent through a server action; phones shrink them first, but allow up to 4 MB.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
