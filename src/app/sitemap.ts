import type { MetadataRoute } from "next";
import { CANONICAL_SITE_URL } from "@/lib/appUrl";
import { LEGAL_PAGES, SITEMAP_PATHS } from "@/lib/publicPages";

// Une page publique ajoutée au site doit être ajoutée à src/lib/publicPages.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  return SITEMAP_PATHS.map((path) => ({
    url: `${CANONICAL_SITE_URL}${path}`,
    changeFrequency: path === "" ? "weekly" : LEGAL_PAGES.includes(path) ? "yearly" : "monthly",
    priority: path === "" ? 1 : LEGAL_PAGES.includes(path) ? 0.3 : 0.6,
  }));
}
