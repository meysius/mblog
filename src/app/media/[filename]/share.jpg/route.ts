import { MEDIA_CACHE_CONTROL, SHARE_IMAGE } from "@/lib/media";
import { renderShareImage } from "@/lib/share-image";

// /media/<filename>/share.jpg: the image as link previews show it (src/lib/share-image.ts).
// Uploads never change, so neither does this. Crawlers cache it like the image.
export async function GET(_request: Request, { params }: RouteContext<"/media/[filename]/share.jpg">) {
  const { filename } = await params;
  const image = await renderShareImage(filename).catch(() => null);
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": SHARE_IMAGE.type,
      "Content-Length": String(image.length),
      "Cache-Control": MEDIA_CACHE_CONTROL,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
