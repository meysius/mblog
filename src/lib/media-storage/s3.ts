import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { MEDIA_CACHE_CONTROL } from "@/lib/media";
import type { MediaStorage } from ".";

type S3Config = {
  bucket: string;
  region: string;
  /** For providers other than AWS, like Cloudflare R2. */
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
};

/** Keeps files in an S3-compatible bucket, named by their filename. */
export function s3Storage({ bucket, region, endpoint, ...credentials }: S3Config): MediaStorage {
  const client = new S3Client({
    region,
    endpoint,
    credentials,
    // Other providers are addressed as <endpoint>/<bucket>, which they all support.
    forcePathStyle: Boolean(endpoint),
    // Send checksums only where S3 requires them; not every compatible provider accepts the rest.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  return {
    async write(filename, data, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: filename,
          Body: data,
          ContentType: contentType,
          // Returned as-is when the bucket serves the file to browsers directly.
          CacheControl: MEDIA_CACHE_CONTROL,
        }),
      );
    },
    async read(filename) {
      try {
        const { Body } = await client.send(new GetObjectCommand({ Bucket: bucket, Key: filename }));
        return Body ? Body.transformToWebStream() : null;
      } catch (e) {
        if (e instanceof NoSuchKey) return null;
        throw e;
      }
    },
    async remove(filename) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: filename }));
    },
  };
}
