import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Use server external packages instead of the deprecated option
  serverExternalPackages: [],
  
  // We won't modify webpack devtool as it causes performance issues
  
  // Polyfill for Node.js modules that might be needed in client components
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client-side specific config
      config.resolve.fallback = {
        ...config.resolve.fallback,
        dns: false
      };
    }
    
    return config;
  },
};

export default nextConfig;
