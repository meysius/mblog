// Shared by the editor and the save action.

/** Room for a sentence or two. */
export const EXCERPT_MAX_LENGTH = 300;

/** An excerpt is one paragraph, even when it's typed or pasted as several. */
export function joinLines(text: string) {
  return text.replace(/\s*\n\s*/g, " ");
}
