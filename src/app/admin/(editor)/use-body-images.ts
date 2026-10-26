import { useState, type RefObject } from "react";
import { flushSync } from "react-dom";
import type { MediaImage } from "@/lib/media";

// Surrounds text with blank lines as needed, so it renders as its own block.
function asBlock(value: string, start: number, end: number, text: string) {
  const before = value.slice(0, start);
  const after = value.slice(end);
  const lead =
    before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const trail = after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  return lead + text + trail;
}

function placeholderFor(value: string, name: string) {
  let placeholder = `![Uploading ${name}…]()`;
  for (let n = 2; value.includes(placeholder); n++) {
    placeholder = `![Uploading ${name} (${n})…]()`;
  }
  return placeholder;
}

/**
 * Adds images to the Markdown body. Each one starts as a placeholder at the caret
 * and becomes `![](url)` once uploaded, so writing can carry on in the meantime.
 */
export function useBodyImages(
  textarea: RefObject<HTMLTextAreaElement | null>,
  setBody: (body: string) => void,
  upload: (file: File) => Promise<MediaImage>,
) {
  const [error, setError] = useState<string | null>(null);

  // Replaces start..end with text. The caret goes to `caret` (an offset into
  // the new text) if given; otherwise the user's selection stays on the same text.
  function splice(start: number, end: number, text: string, caret?: number) {
    const el = textarea.current;
    if (!el) return;
    const shift = text.length - (end - start);
    const keep = (pos: number) =>
      pos <= start ? pos : pos >= end ? pos + shift : start + text.length;
    const [selectionStart, selectionEnd] = [el.selectionStart, el.selectionEnd];
    const focused = document.activeElement === el;

    // Render now, so the textarea holds the new text before the selection is set.
    flushSync(() => setBody(el.value.slice(0, start) + text + el.value.slice(end)));
    if (caret !== undefined) el.setSelectionRange(start + caret, start + caret);
    else if (focused) el.setSelectionRange(keep(selectionStart), keep(selectionEnd));
  }

  function replacePlaceholder(placeholder: string, markdown: string) {
    const el = textarea.current;
    const start = el ? el.value.indexOf(placeholder) : -1;
    if (!el || start === -1) return; // Deleted while uploading.
    const end = start + placeholder.length;

    // If the caret hasn't moved since the image went in, put it in the alt text,
    // ready to describe the image.
    const caretUnmoved =
      document.activeElement === el &&
      el.selectionStart === el.selectionEnd &&
      el.selectionStart >= end &&
      /^\n{0,2}$/.test(el.value.slice(end, el.selectionStart));
    splice(start, end, markdown, caretUnmoved && markdown ? "![".length : undefined);
  }

  function insertImages(files: File[]) {
    const el = textarea.current;
    if (!el) return;
    const images = files.filter((file) => file.type.startsWith("image/"));
    setError(images.length < files.length ? "Only images can be added here." : null);

    el.focus();
    for (const file of images) {
      const placeholder = placeholderFor(el.value, file.name);
      const block = asBlock(el.value, el.selectionStart, el.selectionEnd, placeholder);
      splice(el.selectionStart, el.selectionEnd, block, block.length);
      upload(file).then(
        (image) => replacePlaceholder(placeholder, `![](${image.url})`),
        (e: Error) => {
          replacePlaceholder(placeholder, "");
          setError(e.message);
        },
      );
    }
  }

  return { insertImages, error };
}
