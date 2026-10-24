import "server-only";
import path from "node:path";
import { diskStorage } from "./disk";
import { s3Storage } from "./s3";

// Where uploaded images are kept, chosen by MEDIA_STORAGE: "local" (the default)
// or "s3". Image URLs stay /media/<filename> either way.

export type MediaStorage = {
  write(filename: string, data: Buffer, contentType: string): Promise<void>;
  /** The file's contents, ready to send in a Response, or null if there's no such file. */
  read(filename: string): Promise<BodyInit | null>;
  remove(filename: string): Promise<void>;
};

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

// Only names the upload code generates, which also rules out paths like "../".
const FILENAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.(jpg|png|webp|gif|avif)$/;

function createStorage(): MediaStorage {
  const kind = process.env.MEDIA_STORAGE || "local";
  if (kind === "local") {
    return diskStorage(path.resolve(/* turbopackIgnore: true */ process.env.MEDIA_DIR || "uploads"));
  }
  if (kind !== "s3") throw new Error(`MEDIA_STORAGE must be "local" or "s3", not "${kind}".`);

  const required = ["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`MEDIA_STORAGE=s3 also needs ${missing.join(", ")}.`);
  return s3Storage({
    bucket: process.env.S3_BUCKET!,
    region: process.env.S3_REGION!,
    endpoint: process.env.S3_ENDPOINT || undefined,
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  });
}

let storage: MediaStorage | undefined;

/** The configured storage. Throws if the configuration is incomplete. */
export function mediaStorage() {
  storage ??= createStorage();
  return storage;
}

export async function writeMediaFile(filename: string, data: Buffer) {
  const extension = FILENAME_PATTERN.exec(filename)?.[1];
  if (!extension) throw new Error(`Not a media filename: ${filename}`);
  await mediaStorage().write(filename, data, CONTENT_TYPES[extension]);
}

export async function deleteMediaFile(filename: string) {
  await mediaStorage().remove(filename);
}

/** The file's contents and content type, or null if there's no such file. */
export async function readMediaFile(filename: string) {
  const extension = FILENAME_PATTERN.exec(filename)?.[1];
  if (!extension) return null;
  const body = await mediaStorage().read(filename);
  return body && { body, contentType: CONTENT_TYPES[extension] };
}
