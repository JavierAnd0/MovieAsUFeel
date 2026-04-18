import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Standalone output — bundles only what's needed for production (used by Docker)
  output: "standalone",
  // Prevents the "multiple lockfiles" workspace root warning
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
  },
};

export default nextConfig;
