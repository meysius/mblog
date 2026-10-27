"use server";

import { refresh, updateTag } from "next/cache";
import { after } from "next/server";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { joinLines } from "@/lib/excerpt";
import { deleteUnusedMedia } from "@/lib/media-usage";
import { SETTINGS_TAG } from "@/lib/site";
import {
  INTRO_HEADING_MAX_LENGTH,
  INTRO_TEXT_MAX_LENGTH,
  NAV_LABEL_MAX_LENGTH,
  NAV_URL_MAX_LENGTH,
  type NavLink,
  navUrlError,
  oneLine,
  SITE_DESCRIPTION_MAX_LENGTH,
  SITE_TITLE_MAX_LENGTH,
} from "@/lib/site-settings";

export type NavLinkErrors = { label?: string; url?: string };

export type SettingsFormState = {
  errors?: {
    title?: string;
    // By the link's position in the form, blank rows included.
    navigation?: (NavLinkErrors | null)[];
    introButton?: NavLinkErrors;
  };
  // Set when the settings are saved, so the form can confirm it.
  savedAt?: number;
};

// A link from its two fields: the link, errors to show, or neither when both are empty.
function readNavLink(
  rawLabel: string,
  rawUrl: string,
): { link?: NavLink; errors?: NavLinkErrors } {
  const label = oneLine(rawLabel).slice(0, NAV_LABEL_MAX_LENGTH);
  const url = rawUrl.trim().slice(0, NAV_URL_MAX_LENGTH);
  if (!label && !url) return {};
  if (!label) return { errors: { label: "Add a label." } };
  if (!url) return { errors: { url: "Add a URL." } };
  const urlError = navUrlError(url);
  return urlError ? { errors: { url: urlError } } : { link: { label, url } };
}

export async function saveSettings(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  await requireUser();
  const title = oneLine(String(formData.get("title") ?? "")).slice(0, SITE_TITLE_MAX_LENGTH);
  const description = joinLines(String(formData.get("description") ?? ""))
    .trim()
    .slice(0, SITE_DESCRIPTION_MAX_LENGTH);
  // One label field and one URL field per link, in order.
  const urls = formData.getAll("navUrl").map(String);
  const links = formData
    .getAll("navLabel")
    .map((label, i) => readNavLink(String(label), urls[i] ?? ""));
  const navigation = links.flatMap(({ link }) => link ?? []);
  // Submitted empty when there's no photo.
  const introPhotoId = Number(formData.get("introPhotoId")) || null;
  const introHeading = oneLine(String(formData.get("introHeading") ?? "")).slice(
    0,
    INTRO_HEADING_MAX_LENGTH,
  );
  // Browsers submit textarea line breaks as CRLF; store plain LF.
  const introText = String(formData.get("introText") ?? "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, INTRO_TEXT_MAX_LENGTH);
  const introButton = readNavLink(
    String(formData.get("introButtonLabel") ?? ""),
    String(formData.get("introButtonUrl") ?? ""),
  );

  const errors: SettingsFormState["errors"] = {};
  if (!title) errors.title = "Add a title.";
  if (links.some((link) => link.errors)) {
    errors.navigation = links.map((link) => link.errors ?? null);
  }
  if (introButton.errors) errors.introButton = introButton.errors;
  if (errors.title || errors.navigation || errors.introButton) return { errors };

  const values = {
    title,
    description,
    navigation,
    introPhotoId,
    introHeading,
    introText,
    introButtonLabel: introButton.link?.label ?? "",
    introButtonUrl: introButton.link?.url ?? "",
  };
  const [previous] = await db.select({ photoId: siteSettings.introPhotoId }).from(siteSettings);
  await db
    .insert(siteSettings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: siteSettings.id, set: values });

  updateTag(SETTINGS_TAG);
  // Re-render the page so the form shows the saved settings.
  refresh();
  // A photo that was replaced or removed goes, unless a post uses it too.
  const oldPhotoId = previous?.photoId;
  if (oldPhotoId && oldPhotoId !== introPhotoId) after(() => deleteUnusedMedia([oldPhotoId]));
  return { savedAt: Date.now() };
}
