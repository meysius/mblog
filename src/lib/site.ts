import "server-only";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { mediaSrc, type MediaImage } from "@/lib/media";
import type { SiteSettings } from "@/lib/site-settings";

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

/** What the site uses until its settings are first saved. */
const DEFAULT_SETTINGS: SiteSettings = {
  title: "mblog",
  description: "A personal blog",
  navigation: [],
};

const settingsColumns = {
  title: siteSettings.title,
  description: siteSettings.description,
  navigation: siteSettings.navigation,
};

// Cached like the posts (see src/lib/posts.ts), until a save calls updateTag("settings").
export const SETTINGS_TAG = "settings";

/** The site's title, description and header links. */
export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag(SETTINGS_TAG);
  const [settings] = await db.select(settingsColumns).from(siteSettings).limit(1);
  return settings ?? DEFAULT_SETTINGS;
}

/** The saved settings, uncached, for the admin's settings form. */
export async function getSettingsForEditing(): Promise<SiteSettings> {
  await requireUser();
  const [settings] = await db.select(settingsColumns).from(siteSettings).limit(1);
  return settings ?? DEFAULT_SETTINGS;
}

// Metadata merges shallowly, so a page that sets alternates or openGraph replaces
// the root layout's. Pages use these to keep the shared parts.

/** Links feed readers to the RSS feed, plus the page's canonical URL if it has one. */
export function alternates(site: SiteSettings, canonical?: string): Metadata["alternates"] {
  return {
    canonical,
    types: { "application/rss+xml": [{ url: RSS_PATH, title: site.title }] },
  };
}

export function openGraphDefaults(site: SiteSettings) {
  return { siteName: site.title, locale: "en_US" } satisfies Metadata["openGraph"];
}

/** A feature image as share previews show it. */
export function shareImages(image: MediaImage | null, alt: string) {
  return image
    ? [{ url: mediaSrc(image.url), width: image.width, height: image.height, alt: alt || undefined }]
    : undefined;
}
