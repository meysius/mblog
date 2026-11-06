import "server-only";
import { randomBytes } from "node:crypto";
import path from "node:path";
import sharp, { type Metadata } from "sharp";
import { db } from "@/db";
import { media } from "@/db/schema";
import { FAVICON_SIZE, type MediaImage, type MediaKind, mediaUrl } from "@/lib/media";
import { deleteMediaFile, writeMediaFile } from "@/lib/media-storage";
import { slugify } from "@/lib/slug";

// Wide enough for the post column on a high-density screen. Phone photos shrink a lot.
const MAX_DIMENSION = 2000;

// Uploads keep their format; these are the encoder settings for each.
const FORMATS = {
  jpeg: { extension: "jpg", options: { quality: 82, mozjpeg: true } },
  png: { extension: "png", options: {} },
  webp: { extension: "webp", options: { quality: 82 } },
  gif: { extension: "gif", options: {} },
  avif: { extension: "avif", options: {} },
} as const;

type Format = keyof typeof FORMATS;

function formatOf({ format, compression }: Metadata): Format | null {
  // sharp reports AVIF as HEIF compressed with AV1. Other HEIF, like iPhone HEIC, can't be decoded.
  if (format === "heif") return compression === "av1" ? "avif" : null;
  return format in FORMATS ? (format as Format) : null;
}

// A readable name from the original file, made unique: "beach-day-3f9a0c1b2d4e.jpg".
function filenameFor(originalName: string, format: Format) {
  const name = slugify(path.parse(originalName).name).slice(0, 60).replace(/-$/, "") || "image";
  return `${name}-${randomBytes(6).toString("hex")}.${FORMATS[format].extension}`;
}

/**
 * Stores an uploaded image: rotated upright, scaled down to MAX_DIMENSION and
 * re-encoded. Re-encoding drops EXIF and other metadata, such as where a photo was taken.
 *
 * A favicon is instead cropped to the square in its middle, scaled down to
 * FAVICON_SIZE and made a PNG, which every browser shows. An animated one keeps
 * its first frame.
 */
export async function saveImage(
  file: File,
  kind: MediaKind = "image",
): Promise<MediaImage | { error: string }> {
  const favicon = kind === "favicon";
  const image = sharp(Buffer.from(await file.arrayBuffer()), {
    animated: !favicon,
    autoOrient: true,
  });
  const metadata = await image.metadata().catch(() => null);
  const format = metadata && formatOf(metadata);
  if (!format) {
    return { error: "That file isn’t a supported image. Use JPEG, PNG, WebP, GIF or AVIF." };
  }
  // Turning an image upright swaps its sides, which doesn't change the shorter one.
  const side = Math.min(FAVICON_SIZE, metadata.width, metadata.height);
  const outputFormat = favicon ? "png" : format;

  let output;
  try {
    output = await image
      .resize(
        favicon
          ? { width: side, height: side, fit: "cover" }
          : {
              width: MAX_DIMENSION,
              height: MAX_DIMENSION,
              fit: "inside",
              withoutEnlargement: true,
            },
      )
      .toFormat(outputFormat, FORMATS[outputFormat].options)
      .toBuffer({ resolveWithObject: true });
  } catch {
    return { error: "That image couldn’t be read. The file may be damaged." };
  }

  const { data, info } = output;
  // An animated image's height covers all its frames stacked; one frame is pageHeight.
  const size = { width: info.width, height: info.pageHeight ?? info.height };
  const filename = filenameFor(file.name, outputFormat);
  await writeMediaFile(filename, data);
  try {
    const [{ id }] = await db
      .insert(media)
      .values({ filename, ...size })
      .returning({ id: media.id });
    return { id, url: mediaUrl(filename), ...size };
  } catch (e) {
    await deleteMediaFile(filename);
    throw e;
  }
}
