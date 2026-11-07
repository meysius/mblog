import "server-only";
import sharp, { type Sharp } from "sharp";
import { SHARE_IMAGE } from "@/lib/media";
import { readMediaFile } from "@/lib/media-storage";

// Cropping to fill the frame is fine while it keeps most of the image: a
// landscape photo loses a little at the top and bottom.
const MIN_KEPT = 0.7;

/**
 * An uploaded image as a 1200×630 JPEG for link previews, or null if there's no
 * such file. An image near that shape fills the frame. Any other, like a tall
 * screenshot, is shown whole over a blurred copy of itself that fills the frame.
 */
export async function renderShareImage(filename: string): Promise<Buffer | null> {
  const file = await readMediaFile(filename);
  if (!file) return null;

  const source = Buffer.from(await new Response(file.body).arrayBuffer());
  const { width, height } = await sharp(source).metadata();
  const fill = (image: Sharp) =>
    image
      .resize({ width: SHARE_IMAGE.width, height: SHARE_IMAGE.height, fit: "cover" })
      .flatten({ background: "#ffffff" });

  const shape = width / height / (SHARE_IMAGE.width / SHARE_IMAGE.height);
  let image;
  if (shape >= MIN_KEPT && shape <= 1 / MIN_KEPT) {
    image = fill(sharp(source));
  } else {
    const [background, foreground] = await Promise.all([
      fill(sharp(source)).blur(48).modulate({ brightness: 0.85 }).toBuffer(),
      sharp(source)
        .resize({
          width: SHARE_IMAGE.width - 96,
          height: SHARE_IMAGE.height - 64,
          fit: "inside",
          withoutEnlargement: true,
        })
        .toBuffer(),
    ]);
    image = sharp(background).composite([{ input: foreground, gravity: "center" }]);
  }
  return image.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
}
