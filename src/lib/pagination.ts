// The home page and each tag's page list their posts a page at a time, like Ghost:
// the first page at the list's own URL, the rest at /page/2, /page/3…

export const POSTS_PER_PAGE = 25;

/** How many pages a list of this many posts takes. Even an empty list has one. */
export const pageCount = (total: number) => Math.max(1, Math.ceil(total / POSTS_PER_PAGE));

/**
 * The page number in a /page/<n> URL, or null if it isn't one. The first page is
 * at the list's own URL, so /page/1 isn't one either.
 */
export function parsePageParam(value: string) {
  const page = Number(value);
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(page) && page > 1 ? page : null;
}

/** Where a page of the list at this path is, such as /page/2 or /tags/notes/page/2. */
export function pagePath(path: string, page: number) {
  if (page === 1) return path;
  return `${path === "/" ? "" : path}/page/${page}`;
}

/** The pages after the first, as route params for generateStaticParams. */
export function laterPages(count: number) {
  return Array.from({ length: count - 1 }, (_, i) => String(i + 2));
}
