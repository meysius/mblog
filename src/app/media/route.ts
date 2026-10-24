import { getCurrentUser } from "@/lib/auth";
import { MAX_IMAGE_BYTES, TOO_LARGE_MESSAGE } from "@/lib/media";
import { saveImage } from "@/lib/media-upload";

// Leaves room for the multipart boundaries around the file.
const MAX_BODY_BYTES = MAX_IMAGE_BYTES + 64 * 1024;

function error(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

// The session cookie is SameSite=Lax, so other sites can't upload as the owner.
// Checking Origin also turns away other origins on the same site, as Server Actions do.
function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return origin !== null && URL.canParse(origin) && new URL(origin).host === host;
}

/** Uploads an image. Responds with its MediaImage, or { error } to show the user. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return error(403, "Uploads have to come from this site.");
  if (!(await getCurrentUser())) {
    return error(401, "You’ve been signed out. Sign in again in a new tab, then retry.");
  }
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return error(413, TOO_LARGE_MESSAGE);
  }

  const file = (await request.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return error(400, "Choose an image to upload.");
  if (file.size > MAX_IMAGE_BYTES) return error(413, TOO_LARGE_MESSAGE);

  const result = await saveImage(file);
  if ("error" in result) return error(415, result.error);
  return Response.json(result, { status: 201 });
}
