import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Prevents the "multiple lockfiles" workspace root warning on Vercel
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
