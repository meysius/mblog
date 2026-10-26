// Shared by the editor, the admin lists and the save actions.

/**
 * Posts and pages are both rows in the posts table. A post is dated, tagged and
 * listed on the blog; a page stands on its own at /<slug>, like /about.
 */
export type PostKind = "post" | "page";

/** Where readers find it once it's published. */
export function readerPath(kind: PostKind, slug: string) {
  return kind === "page" ? `/${slug}` : `/posts/${slug}`;
}

/** The admin's list of posts or of pages. */
export function listPath(kind: PostKind) {
  return kind === "page" ? "/admin/pages" : "/admin";
}

export function editorPath(kind: PostKind, id: number) {
  return `/admin/${kind}s/${id}`;
}

/** The saved version as readers would see it, drafts included. */
export function previewPath(kind: PostKind, id: number) {
  return `${editorPath(kind, id)}/preview`;
}

/**
 * Top-level routes the site already has, so no page can use them as its URL.
 * Keep in step with the folders in src/app.
 */
export const RESERVED_PAGE_SLUGS = ["admin", "media", "posts", "rss", "tags"];
