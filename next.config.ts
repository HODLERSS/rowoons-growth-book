import type { NextConfig } from "next";
import { execFileSync } from "node:child_process";
import path from "node:path";

// Generate the per-month content chunks (src/content/gen) on every build and dev start,
// regardless of whether the build was started through npm scripts or directly by a host like Vercel.
execFileSync(process.execPath, [path.resolve(process.cwd(), "scripts/split-content.mjs")], { stdio: "inherit" });

/** BUILD_TARGET=native produces a static export for Capacitor (no API routes, no admin page). */
const native = process.env.BUILD_TARGET === "native";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  // This repo lives under a folder that has its own lockfile; pin the root so tracing/turbopack never guess.
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
  output: native ? "export" : undefined,
  // Web-only files use the .web.tsx / .web.ts extension; the native build never sees them.
  pageExtensions: native ? ["tsx", "ts"] : ["web.tsx", "web.ts", "tsx", "ts"],
  images: { unoptimized: true },
  ...(native
    ? {}
    : {
        async headers() {
          return [{ source: "/(.*)", headers: securityHeaders }];
        },
      }),
};

export default nextConfig;
