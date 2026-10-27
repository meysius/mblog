// Shared by the site and the editor's preview.

// About how fast people read on screens.
const WORDS_PER_MINUTE = 230;

/**
 * The words in a Markdown body, counted as runs of characters other than spaces.
 * Markdown's own marks, like a list item's dash, count too, which is near enough.
 * Post lists count in SQL the same way (wordCount in src/lib/posts.ts).
 */
export function countWords(markdown: string) {
  return markdown.match(/\S+/g)?.length ?? 0;
}

/** "4 min read", and never less than a minute. */
export function formatReadingTime(words: number) {
  return `${Math.max(1, Math.round(words / WORDS_PER_MINUTE))} min read`;
}
