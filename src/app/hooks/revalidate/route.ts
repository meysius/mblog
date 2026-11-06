import { revalidateTag } from "next/cache";
import { POSTS_TAG } from "@/lib/posts";
import { sameSecret } from "@/lib/secrets";
import { SETTINGS_TAG } from "@/lib/site";

// Marks every cached public read out of date. The server calls this on itself
// each time it starts (deploy/mblog-reset-cache): releases are built against an
// empty database, so until then the prerendered home page, feed and sitemap list
// no posts, and a restart forgets which reads saves marked out of date.
// { expire: 0 } makes the next visit wait for fresh data instead of getting the
// old page while it renders in the background. nginx doesn't pass this path on.
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return new Response(null, { status: 404 });
  if (!sameSecret(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return Response.json({ error: "Bad token" }, { status: 401 });
  }

  revalidateTag(POSTS_TAG, { expire: 0 });
  revalidateTag(SETTINGS_TAG, { expire: 0 });
  return new Response(null, { status: 204 });
}
