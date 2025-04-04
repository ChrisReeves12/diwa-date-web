import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Use server external packages instead of the deprecated option
  serverExternalPackages: [],
  
  // We won't modify webpack devtool as it causes performance issues
};

export default nextConfig;
