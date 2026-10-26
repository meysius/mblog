import "server-only";
import type { Metadata } from "next";

export const SITE_NAME = "mblog";
export const SITE_DESCRIPTION = "A personal blog";

function siteUrl() {
  const value = process.env.SITE_URL;
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Set SITE_URL to the site's public address, such as https://example.com.");
    }
    return "http://localhost:3000";
  }

  const url = URL.canParse(value) ? new URL(value) : null;
  if (!url || !["http:", "https:"].includes(url.protocol) || url.pathname !== "/" || url.search) {
    throw new Error(`SITE_URL must be an address like https://example.com, not "${value}".`);
  }
  return url.origin;
}

/**
 * The site's public address, such as https://example.com. Canonical links, share
 * previews, the sitemap and the RSS feed need full URLs. Pages are prerendered, so
 * they keep the value from build time.
 */
export const SITE_URL = siteUrl();

/** The full URL of a path on this site, such as /posts/hello. */
export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).href;
}

export const RSS_PATH = "/rss";

// Metadata merges shallowly, so a page that sets alternates or openGraph replaces
// the root layout's. Pages spread these to keep the shared parts.

/** Links feed readers to the RSS feed, plus the page's canonical URL if it has one. */
export function alternates(canonical?: string): Metadata["alternates"] {
  return {
    canonical,
    types: { "application/rss+xml": [{ url: RSS_PATH, title: SITE_NAME }] },
  };
}

export const openGraphDefaults = {
  siteName: SITE_NAME,
  locale: "en_US",
} satisfies Metadata["openGraph"];
