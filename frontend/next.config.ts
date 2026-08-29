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
};

export default nextConfig;
