// Shared by the upload route and the editor. Server-side processing is in media-upload.ts.

/** What the file picker offers. The server checks the file's actual contents. */
export const IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif,image/avif";
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const TOO_LARGE_MESSAGE = "That image is over 20 MB. Try a smaller one.";

export type MediaImage = { id: number; url: string; width: number; height: number };

// Every upload gets a new filename, so a file never changes once it's served.
export const MEDIA_CACHE_CONTROL = "public, max-age=31536000, immutable";

/** How posts refer to an image, wherever media storage keeps the file. */
export function mediaUrl(filename: string) {
  return `/media/${filename}`;
}

// Set when the bucket serves images to browsers itself. Read at build time.
const PUBLIC_MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL?.replace(/\/+$/, "");

/**
 * Where browsers load an image from: its /media/ URL, or the same file on the
 * bucket's public domain when NEXT_PUBLIC_MEDIA_URL is set.
 */
export function mediaSrc(url: string) {
  return PUBLIC_MEDIA_URL && url.startsWith("/media/")
    ? PUBLIC_MEDIA_URL + url.slice("/media".length)
    : url;
}

/** Uploads an image from the browser. Errors carry a message to show the user. */
export async function uploadImage(file: File): Promise<MediaImage> {
  if (file.size > MAX_IMAGE_BYTES) throw new Error(TOO_LARGE_MESSAGE);

  const body = new FormData();
  body.set("file", file);
  let response: Response;
  try {
    response = await fetch("/media", { method: "POST", body });
  } catch {
    throw new Error("Couldn’t reach the server. Check your connection and try again.");
  }
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error ?? "The upload failed. Try again.");
  return result;
}
