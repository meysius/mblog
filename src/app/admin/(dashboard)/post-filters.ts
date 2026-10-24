import type { PostStatus } from "@/lib/posts";

// The post list filters by ?status=; anything else shows every post.

export const FILTER_LABELS = { all: "All posts", draft: "Drafts", published: "Published" };

export function parseStatus(value: unknown): PostStatus | undefined {
  return value === "draft" || value === "published" ? value : undefined;
}

export function postsHref(status?: PostStatus) {
  return status ? `/admin?status=${status}` : "/admin";
}
