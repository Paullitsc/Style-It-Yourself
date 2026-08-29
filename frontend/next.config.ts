import type { NextConfig } from "next";
import path from "node:path";

// Next always loads this config with cwd = the Next project dir (frontend/),
// so one level up is the monorepo root.
const repoRoot = path.join(process.cwd(), "..");

const nextConfig: NextConfig = {
  // Standalone is for the Docker image; Vercel manages its own output and
  // breaks if standalone is on (missing next-server.js.nft.json at build end).
  output: process.env.VERCEL ? undefined : "standalone",
  // @siy/ui ships raw TSX from src/, so Next must compile it.
  transpilePackages: ["@siy/ui"],
  // Without this, `output: standalone` traces only frontend/ and omits packages/ui.
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
  },
  // Security headers applied to every route. frame-ancestors/X-Frame-Options
  // stop the site (notably /extension/connect, which auto-posts the session)
  // from being silently embedded in an attacker's iframe. The rest are cheap,
  // broadly-safe hardening.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
