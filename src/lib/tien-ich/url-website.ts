import "server-only";

function boDauGachCuoi(giaTri: string) {
  return giaTri.replace(/\/+$/, "");
}

export function layUrlWebsite(yeuCau?: Request) {
  const urlCauHinh = process.env.NEXT_PUBLIC_DIA_CHI_WEBSITE?.trim();

  if (urlCauHinh) {
    return boDauGachCuoi(urlCauHinh);
  }

  if (yeuCau) {
    const forwardedHost = yeuCau.headers.get("x-forwarded-host");
    const forwardedProtocol = yeuCau.headers.get("x-forwarded-proto");
    const host = forwardedHost || yeuCau.headers.get("host");

    if (host) {
      const protocol = forwardedProtocol ||
        (host.includes("localhost") ? "http" : "https");

      return boDauGachCuoi(`${protocol}://${host}`);
    }
  }

  return "http://localhost:3000";
}

export function taoUrlWebsite(
  duongDan: string,
  yeuCau?: Request
) {
  const path = duongDan.startsWith("/")
    ? duongDan
    : `/${duongDan}`;

  return new URL(path, `${layUrlWebsite(yeuCau)}/`);
}
