import { MEDIA_CACHE_CONTROL, mediaSrc, mediaUrl } from "@/lib/media";
import { readMediaFile } from "@/lib/media-storage";

export async function GET(_request: Request, { params }: RouteContext<"/media/[filename]">) {
  const { filename } = await params;

  // When the bucket serves images itself, send requests for /media/ there.
  const url = mediaUrl(filename);
  if (mediaSrc(url) !== url) return Response.redirect(mediaSrc(url), 307);

  const file = await readMediaFile(filename);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(file.body, {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": MEDIA_CACHE_CONTROL,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
