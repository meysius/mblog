import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/setup"];

// A quick redirect for visitors with no session cookie at all. It doesn't check
// that the session is valid; requireUser() does that next to the data.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_ADMIN_PATHS.includes(pathname) || request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: "/admin/:path*",
};
