import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/admin" },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
