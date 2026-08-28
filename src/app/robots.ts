import type { MetadataRoute } from "next";
import { getAppOriginString } from "@/lib/appUrl";
import { INFO_PAGES } from "@/lib/infoPages";

export default function robots(): MetadataRoute.Robots {
  const origin = getAppOriginString();
  const placeholderPages = Object.values(INFO_PAGES)
    .filter((page) => page.needsAdminReview)
    .map((page) => `/${page.slug}`);

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
        ...placeholderPages,
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
