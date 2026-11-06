import "server-only";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { media, siteSettings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { mediaSrc, type MediaImage } from "@/lib/media";
import { featureImageColumns, toMediaImage } from "@/lib/posts";
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
  favicon: null,
  navigation: [],
  intro: { photo: null, heading: "", text: "", button: null },
};

// The favicon's row in media, next to the intro photo's.
const faviconMedia = alias(media, "favicon");

async function readSettings(): Promise<SiteSettings> {
  const [row] = await db
    .select({
      title: siteSettings.title,
      description: siteSettings.description,
      favicon: {
        id: faviconMedia.id,
        filename: faviconMedia.filename,
        width: faviconMedia.width,
        height: faviconMedia.height,
      },
      navigation: siteSettings.navigation,
      introPhoto: featureImageColumns,
      introHeading: siteSettings.introHeading,
      introText: siteSettings.introText,
      introButtonLabel: siteSettings.introButtonLabel,
      introButtonUrl: siteSettings.introButtonUrl,
    })
    .from(siteSettings)
    .leftJoin(media, eq(media.id, siteSettings.introPhotoId))
    .leftJoin(faviconMedia, eq(faviconMedia.id, siteSettings.faviconId))
    .limit(1);
  if (!row) return DEFAULT_SETTINGS;

  const { favicon, introPhoto, introHeading, introText, introButtonLabel, introButtonUrl, ...site } =
    row;
  return {
    ...site,
    favicon: toMediaImage(favicon),
    intro: {
      photo: toMediaImage(introPhoto),
      heading: introHeading,
      text: introText,
      button:
        introButtonLabel && introButtonUrl
          ? { label: introButtonLabel, url: introButtonUrl }
          : null,
    },
  };
}

// Cached like the posts (see src/lib/posts.ts), until a save calls updateTag("settings").
export const SETTINGS_TAG = "settings";

/** The site's title, description, favicon, header links and home page intro. */
export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag(SETTINGS_TAG);
  return readSettings();
}

/** The saved settings, uncached, for the admin's settings form. */
export async function getSettingsForEditing(): Promise<SiteSettings> {
  await requireUser();
  return readSettings();
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

/**
 * The favicon's links: the uploaded one, for browser tabs and phone home screens,
 * or else public/favicon.ico. The site sets them here rather than with an app/
 * favicon.ico, whose link Next.js would add alongside an uploaded one.
 */
export function icons(favicon: MediaImage | null): Metadata["icons"] {
  if (!favicon) return { icon: "/favicon.ico" };
  const url = mediaSrc(favicon.url);
  const sizes = `${favicon.width}x${favicon.height}`;
  return { icon: { url, type: "image/png", sizes }, apple: { url, sizes } };
}

/** A feature image as share previews show it. */
export function shareImages(image: MediaImage | null, alt: string) {
  return image
    ? [{ url: mediaSrc(image.url), width: image.width, height: image.height, alt: alt || undefined }]
    : undefined;
}
