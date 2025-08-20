import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    CHAT_MESSAGES_PAGE_SIZE: process.env.CHAT_MESSAGES_PAGE_SIZE || '20',
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    }
  },

  // Use server external packages instead of the deprecated option
  serverExternalPackages: [],

  devIndicators: false,

  sassOptions: {
    sourceMap: true
  },

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
