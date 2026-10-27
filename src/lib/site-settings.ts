// Shared by the settings form and its save action.

import type { MediaImage } from "@/lib/media";

/** A link in the site's header. */
export type NavLink = { label: string; url: string };

/** The top of the home page: a photo, a heading, Markdown text and a button, each optional. */
export type Intro = {
  photo: MediaImage | null;
  heading: string;
  text: string;
  button: NavLink | null;
};

export type SiteSettings = {
  title: string;
  description: string;
  navigation: NavLink[];
  intro: Intro;
};

export const SITE_TITLE_MAX_LENGTH = 100;

/** Room for a sentence or two, like an excerpt. */
export const SITE_DESCRIPTION_MAX_LENGTH = 300;

export const INTRO_HEADING_MAX_LENGTH = 100;

/** A short paragraph or two. */
export const INTRO_TEXT_MAX_LENGTH = 1000;

export function hasIntro({ photo, heading, text, button }: Intro) {
  return Boolean(photo || heading || text || button);
}

/** Links show side by side in the header, so a word or two. */
export const NAV_LABEL_MAX_LENGTH = 50;

export const NAV_URL_MAX_LENGTH = 2000;

/** A title or label is one line with single spaces, even when pasted from several. */
export function oneLine(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Why a header link's URL won't work, or undefined if it will: a path on this site
 * such as /about, or a full http(s) or mailto address.
 */
export function navUrlError(url: string) {
  if (url.startsWith("/") && !url.startsWith("//")) return undefined;
  if (URL.canParse(url) && ["http:", "https:", "mailto:"].includes(new URL(url).protocol)) {
    return undefined;
  }
  return "Start with / for a page on this site, like /about, or with https:// for another site.";
}

/** Links to this site use client-side navigation; any other opens as a normal link. */
export function isInternal(url: string) {
  return url.startsWith("/");
}
