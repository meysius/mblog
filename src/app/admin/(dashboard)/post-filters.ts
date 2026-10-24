import type { PostStatus } from "@/lib/posts";

// The post list filters by ?status=, anything else showing every post, and
// pages with ?page=, starting at 1.

export const FILTER_LABELS = { all: "All", draft: "Drafts", published: "Published" };

export const POSTS_PER_PAGE = 20;

export function parseStatus(value: unknown): PostStatus | undefined {
  return value === "draft" || value === "published" ? value : undefined;
}

export function parsePage(value: unknown) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 1 ? page : 1;
}

export function postsHref(status?: PostStatus, page = 1) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin?${query}` : "/admin";
}
