import type { NextConfig } from "next";
import { getAppOrigin, isHttpsOrigin, parsePublicHostname } from "./src/lib/appUrl";
import { bogCalculatorCspSources } from "./src/lib/bogSdk";

function imageRemotePatterns(): { protocol: "http" | "https"; hostname: string; pathname: string }[] {
  const hosts = new Set<string>();
  const r2 = parsePublicHostname(process.env.R2_PUBLIC_URL);
  if (r2) hosts.add(r2);
  for (const extra of (process.env.IMAGE_REMOTE_HOSTS ?? "").split(",")) {
    const host = parsePublicHostname(extra);
    if (host) hosts.add(host);
  }
  return [...hosts].map((hostname) => ({
    protocol: "https",
    hostname,
    pathname: "/**",
  }));
}

function contentSecurityPolicy(): string {
  const bog = bogCalculatorCspSources();
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${bog.scriptSrc.join(" ")}`,
    `style-src 'self' 'unsafe-inline' ${bog.styleSrc.join(" ")}`,
    "img-src 'self' data: blob: http: https:",
    `font-src 'self' ${bog.fontSrc.join(" ")}`,
    `connect-src 'self' ${bog.connectSrc.join(" ")}`,
    `frame-src 'self' ${bog.frameSrc.join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    `form-action 'self' ${bog.formAction.join(" ")}`,
    "object-src 'none'",
  ].join("; ");
}

function securityHeaders(): { key: string; value: string }[] {
  const headers: { key: string; value: string }[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  ];
  if (isHttpsOrigin(getAppOrigin()) || process.env.ENABLE_HSTS === "true") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    });
  }
  return headers;
}

const remotePatterns = imageRemotePatterns();

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "bcryptjs", "sharp", "@aws-sdk/client-s3"],
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(),
      },
    ];
  },
  ...(remotePatterns.length ? { images: { remotePatterns } } : {}),
};

export default nextConfig;
