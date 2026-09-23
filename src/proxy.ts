import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  const laYoutube =
    host === "youtube.duongnt.io.vn" ||
    host === "youtube.localhost" ||
    host.startsWith("youtube.localhost.");
  const laCongDoanProxy =
    host.endsWith(".onrender.com") &&
    request.headers.get("x-congdoan-proxy") === "1";
  const laCongDoan =
    host === "congdoan.duongnt.io.vn" ||
    host === "congdoan.localhost" ||
    host.startsWith("congdoan.localhost.") ||
    laCongDoanProxy;

  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);
  // This header is internal routing context, never trusted from the client.
  requestHeaders.delete("x-duongtube-app");
  requestHeaders.delete("x-congdoan-app");
  const laYoutubePreview = pathname === "/youtube" || pathname.startsWith("/youtube/");
  const laCongDoanPreview = pathname === "/congdoan" || pathname.startsWith("/congdoan/");
  if (laYoutube || laYoutubePreview) requestHeaders.set("x-duongtube-app", "1");
  if (laCongDoan || laCongDoanPreview) requestHeaders.set("x-congdoan-app", "1");

  if (!laYoutube && !laCongDoan) return NextResponse.next({ request: { headers: requestHeaders } });

  if (laCongDoan) {
    if (
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/congdoan-assets/") ||
      pathname === "/congdoan-manifest.webmanifest" ||
      pathname === "/congdoan-sw.js"
    ) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const url = request.nextUrl.clone();
    url.pathname = laCongDoanPreview
      ? pathname
      : pathname === "/"
        ? "/congdoan"
        : `/congdoan${pathname}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

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
  url.pathname = laYoutubePreview
    ? pathname
    : pathname === "/"
      ? "/youtube"
      : `/youtube${pathname}`;

  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!favicon.ico).*)"],
};
