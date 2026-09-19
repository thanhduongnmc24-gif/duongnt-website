import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  const laYoutube =
    host === "youtube.duongnt.io.vn" ||
    host === "youtube.localhost" ||
    host.startsWith("youtube.localhost.");

  if (!laYoutube) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-duongtube-app", "1");

  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/youtube/") ||
    pathname.startsWith("/youtube-assets/") ||
    pathname === "/youtube-manifest.webmanifest" ||
    pathname === "/youtube-sw.js"
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const url = request.nextUrl.clone();
  url.pathname = pathname.startsWith("/youtube")
    ? pathname
    : pathname === "/"
      ? "/youtube"
      : `/youtube${pathname}`;

  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!favicon.ico).*)"],
};
