"use server";

import { refresh, updateTag } from "next/cache";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { joinLines } from "@/lib/excerpt";
import { SETTINGS_TAG } from "@/lib/site";
import {
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
  };
  // Set when the settings are saved, so the form can confirm it.
  savedAt?: number;
};

// A header link from its two fields: the link, errors to show, or neither for a row left empty.
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

  const errors: SettingsFormState["errors"] = {};
  if (!title) errors.title = "Add a title.";
  if (links.some((link) => link.errors)) {
    errors.navigation = links.map((link) => link.errors ?? null);
  }
  if (errors.title || errors.navigation) return { errors };

  const values = { title, description, navigation };
  await db
    .insert(siteSettings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: siteSettings.id, set: values });

  updateTag(SETTINGS_TAG);
  // Re-render the page so the form shows the saved settings.
  refresh();
  return { savedAt: Date.now() };
}
