import { NextResponse } from "next/server";

const DEFAULT_SERVER_URL = "https://byvn.net/demthep";
const MAX_REDIRECTS = 5;

function isPrivateOrLoopbackHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === "localhost" ||
    lower === "127.0.0.1" ||
    lower === "::1" ||
    lower === "0.0.0.0" ||
    lower.endsWith(".local")
  ) {
    return true;
  }
  if (/^10\./.test(lower)) return true;
  if (/^192\.168\./.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)) return true;
  if (/^169\.254\./.test(lower)) return true;
  return false;
}

function extractHtmlRedirectUrl(html: string, baseUrl: string): string | null {
  // Check <meta http-equiv="refresh" content="0; url=...">
  const metaMatch = html.match(
    /<meta[^>]+http-equiv=["']?refresh["']?[^>]+content=["'][^"']*url=([^"'\s>]+)[^"']*["']/i
  );
  if (metaMatch?.[1]) {
    try {
      return new URL(metaMatch[1].replace(/&amp;/g, "&"), baseUrl).toString();
    } catch {
      /* ignore */
    }
  }
  // Check window.location.href = "..." or window.location.replace("...")
  const jsMatch = html.match(
    /window\.location(?:\.href|\.replace)?\s*(?:=|\()\s*["'](https?:\/\/[^"']+)["']/i
  );
  if (jsMatch?.[1]) {
    return jsMatch[1];
  }
  return null;
}

function buildUpstreamFormData(
  fileBuffer: ArrayBuffer,
  fileName: string,
  fileType: string,
  minConf: string,
  alertConf: string,
  isFiltering: string
): FormData {
  const fd = new FormData();
  const blob = new Blob([fileBuffer], { type: fileType || "image/jpeg" });
  fd.append("file", blob, fileName || "image.jpg");
  fd.append("min_conf", minConf);
  fd.append("alert_conf", alertConf);
  fd.append("is_filtering", isFiltering);
  return fd;
}

export async function POST(request: Request) {
  try {
    const incomingForm = await request.formData();
    const fileEntry = incomingForm.get("file");

    if (!fileEntry || typeof fileEntry === "string") {
      return NextResponse.json(
        { error: "Thiếu file ảnh gửi lên để đếm thép." },
        { status: 400 }
      );
    }

    const rawServerUrl = String(
      incomingForm.get("server_url") || DEFAULT_SERVER_URL
    ).trim();
    const minConf = String(incomingForm.get("min_conf") || "0.6").trim();
    const alertConf = String(incomingForm.get("alert_conf") || "0.7").trim();
    const isFiltering = String(incomingForm.get("is_filtering") || "false").trim();

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawServerUrl || DEFAULT_SERVER_URL);
    } catch {
      return NextResponse.json(
        { error: "Link máy chủ đếm thép không hợp lệ." },
        { status: 400 }
      );
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json(
        { error: "Link máy chủ phải bắt đầu bằng http:// hoặc https://." },
        { status: 400 }
      );
    }

    if (isPrivateOrLoopbackHost(parsedUrl.hostname)) {
      return NextResponse.json(
        {
          error:
            "Link máy chủ nội bộ (LAN/localhost) sẽ được trình duyệt gọi trực tiếp.",
          directOnly: true,
        },
        { status: 400 }
      );
    }

    const fileBuffer = await fileEntry.arrayBuffer();
    const fileName = fileEntry.name || "image.jpg";
    const fileType = fileEntry.type || "image/jpeg";

    let currentUrl = parsedUrl.toString();

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const targetHost = new URL(currentUrl).hostname;
      if (isPrivateOrLoopbackHost(targetHost)) {
        return NextResponse.json(
          { error: "Địa chỉ chuyển hướng không hợp lệ." },
          { status: 400 }
        );
      }

      const upstreamForm = buildUpstreamFormData(
        fileBuffer,
        fileName,
        fileType,
        minConf,
        alertConf,
        isFiltering
      );

      const upstreamRes = await fetch(currentUrl, {
        method: "POST",
        body: upstreamForm,
        headers: {
          "ngrok-skip-browser-warning": "true",
          "User-Agent": "DemThepPWA/1.0 (+https://duongnt.io.vn/demthep)",
        },
        redirect: "manual",
      });

      // Handle HTTP 301/302/303/307/308 redirects while preserving POST + FormData
      if (
        [301, 302, 303, 307, 308].includes(upstreamRes.status) &&
        upstreamRes.headers.get("location")
      ) {
        const location = upstreamRes.headers.get("location")!;
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      // If a URL shortener returns 405 Method Not Allowed on POST, resolve its GET redirect once
      if (upstreamRes.status === 405 && hop < MAX_REDIRECTS) {
        const getRes = await fetch(currentUrl, {
          method: "GET",
          headers: {
            "ngrok-skip-browser-warning": "true",
            "User-Agent": "DemThepPWA/1.0 (+https://duongnt.io.vn/demthep)",
          },
          redirect: "manual",
        });
        const getLoc = getRes.headers.get("location");
        if (getLoc) {
          currentUrl = new URL(getLoc, currentUrl).toString();
          continue;
        }
        const getHtml = await getRes.text();
        const extracted = extractHtmlRedirectUrl(getHtml, currentUrl);
        if (extracted && extracted !== currentUrl) {
          currentUrl = extracted;
          continue;
        }
      }

      const responseText = await upstreamRes.text();

      // If the shortlink returned an HTML redirect page on 200 OK, follow it
      const contentType = upstreamRes.headers.get("content-type") || "";
      if (
        hop < MAX_REDIRECTS &&
        (contentType.includes("text/html") ||
          responseText.trim().startsWith("<!DOCTYPE") ||
          responseText.trim().startsWith("<html"))
      ) {
        const extracted = extractHtmlRedirectUrl(responseText, currentUrl);
        if (extracted && extracted !== currentUrl) {
          currentUrl = extracted;
          continue;
        }
      }

      if (!upstreamRes.ok) {
        return NextResponse.json(
          {
            error: `Máy chủ lỗi ${upstreamRes.status}: ${responseText.slice(0, 120)}`,
          },
          { status: upstreamRes.status }
        );
      }

      try {
        const data = JSON.parse(responseText);
        return NextResponse.json(data, { status: 200 });
      } catch {
        return NextResponse.json(
          {
            error:
              "Máy chủ không trả JSON. Có thể link rút gọn đang trả HTML hoặc redirect sai.",
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      { error: "Link máy chủ chuyển hướng quá nhiều lần." },
      { status: 508 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Không thể kết nối máy chủ.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
