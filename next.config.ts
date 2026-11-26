import type { NextConfig } from "next";

// Cache Components is intentionally off: almost every page reads live
// fundraising data from the database, so pages render per request
// (`export const dynamic = "force-dynamic"`) instead of being prerendered.
const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "exceljs", "pdf-lib"],
  // Uploaded bank slips and application documents are capped at 5 MB each in code.
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  // PDF receipts/reports read the logo from disk; make sure it ships with the serverless functions.
  outputFileTracingIncludes: { "/**": ["./public/brand/mark-white.png"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
