import type { MetadataRoute } from "next";
import { getAppOriginString } from "@/lib/appUrl";

export default function robots(): MetadataRoute.Robots {
  const origin = getAppOriginString();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/account",
        "/account/",
        "/cart",
        "/checkout",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/api/",
        "/search",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
