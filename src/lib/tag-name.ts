// Shared by the editors and the save actions.

/** Tags show as short links, so a few words at most. */
export const TAG_NAME_MAX_LENGTH = 50;

/** Room for a sentence or two, like an excerpt. */
export const TAG_DESCRIPTION_MAX_LENGTH = 300;

/** A tag name is one line with single spaces, even when pasted from several. */
export function cleanTagName(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, TAG_NAME_MAX_LENGTH);
}

/** Names match ignoring case: "Postgres" and "postgres" are the same tag. */
export function sameTagName(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

/** Cleaned names with blanks and repeats dropped. The first spelling of each wins. */
export function uniqueTagNames(names: string[]) {
  const unique: string[] = [];
  for (const name of names.map(cleanTagName)) {
    if (name && !unique.some((other) => sameTagName(other, name))) unique.push(name);
  }
  return unique;
}
