import "server-only";
import DOMPurify from "isomorphic-dompurify";

export function lamSachHtml(noiDung: string): string {
  return DOMPurify.sanitize(noiDung, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button"],
    FORBID_ATTR: [
      "onerror",
      "onload",
      "onclick",
      "onmouseover",
      "onfocus",
      "onanimationstart",
    ],
  });
}

export function chuyenVanBanSangHtml(noiDung: string): string {
  const daMaHoa = noiDung
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("\n", "<br />");

  return lamSachHtml(daMaHoa);
}
