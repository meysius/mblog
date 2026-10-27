import type { PostStatus } from "@/lib/posts";
import { SLUG_PATTERN } from "@/lib/slug";

// The post list filters by ?status= and by tag with ?tag=<slug>, anything else
// showing every post, and pages with ?page=, starting at 1.

export const FILTER_LABELS = {
  all: "All",
  draft: "Drafts",
  scheduled: "Scheduled",
  published: "Published",
};

export const POSTS_PER_PAGE = 20;

export function parseStatus(value: unknown): PostStatus | undefined {
  return value === "draft" || value === "scheduled" || value === "published" ? value : undefined;
}

export function parseTag(value: unknown) {
  return typeof value === "string" && SLUG_PATTERN.test(value) ? value : undefined;
}

export function parsePage(value: unknown) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 1 ? page : 1;
}

export type PostFilter = { status?: PostStatus; tag?: string };

export function postsHref({ status, tag }: PostFilter = {}, page = 1) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (tag) params.set("tag", tag);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin?${query}` : "/admin";
}
